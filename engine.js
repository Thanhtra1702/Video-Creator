/**
 * AnimationEngine - Canvas renderer with rich text, badges, decorations
 * Supports *highlight* markup, badges, accent lines, animated backgrounds
 */
class AnimationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scenes = [];
    this.currentTime = 0;
    this.isPlaying = false;
    this._rafId = null;
    this._lastTimestamp = 0;
    this.onTimeUpdate = null;
    this.onPlaybackEnd = null;
    this._imageCache = new Map();
  }

  isVertical() { return this.canvas.height > this.canvas.width; }
  getTotalDuration() { return this.scenes.reduce((s, sc) => s + sc.duration, 0); }

  getSceneAtTime(time) {
    let elapsed = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const sc = this.scenes[i];
      if (time < elapsed + sc.duration)
        return { scene: sc, index: i, localTime: time - elapsed, sceneStart: elapsed };
      elapsed += sc.duration;
    }
    return null;
  }

  /* --- Easing --- */
  static ease(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
  static easeBack(t) { const c=1.7; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); }

  /* --- Text Wrapping --- */
  wrapText(ctx, text, maxWidth) {
    const lines = [];
    for (const para of text.split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      const words = para.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test.replace(/\*/g, '')).width > maxWidth && cur) {
          lines.push(cur); cur = w;
        } else cur = test;
      }
      if (cur) lines.push(cur);
    }
    return lines;
  }

  /* --- Parse *highlight* markup into segments --- */
  parseRichSegments(text) {
    const segs = [];
    const re = /\*([^*]+)\*/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segs.push({ text: text.slice(last, m.index), hl: false });
      segs.push({ text: m[1], hl: true });
      last = re.lastIndex;
    }
    if (last < text.length) segs.push({ text: text.slice(last), hl: false });
    if (!segs.length) segs.push({ text, hl: false });
    return segs;
  }

  /* --- Animation value --- */
  getAnim(type, progress, totalChars) {
    const p = Math.max(0, Math.min(1, progress));
    const ep = AnimationEngine.ease(p);
    switch (type) {
      case 'fadeIn': return { op: ep, ox: 0, oy: 0, sc: 1 };
      case 'slideUp': return { op: ep, ox: 0, oy: (1-ep)*60, sc: 1 };
      case 'slideDown': return { op: ep, ox: 0, oy: -(1-ep)*60, sc: 1 };
      case 'slideLeft': return { op: ep, ox: (1-ep)*80, oy: 0, sc: 1 };
      case 'slideRight': return { op: ep, ox: -(1-ep)*80, oy: 0, sc: 1 };
      case 'scaleIn': return { op: ep, ox: 0, oy: 0, sc: 0.5 + AnimationEngine.easeBack(p)*0.5 };
      case 'bounceIn': {
        let bp;
        if(p<0.4) bp=7.5625*(p/0.4)*(p/0.4);
        else if(p<0.7) bp=7.5625*(p-0.55)/0.4*(p-0.55)/0.4+0.75;
        else if(p<0.9) bp=7.5625*(p-0.8)/0.4*(p-0.8)/0.4+0.9375;
        else bp=7.5625*(p-0.95)/0.4*(p-0.95)/0.4+0.984375;
        bp=Math.min(1,bp);
        return { op: Math.min(1,p*3), ox: 0, oy: (1-bp)*80, sc: 1 };
      }
      case 'rotateIn': return { op: ep, ox: 0, oy: 0, sc: ep, rot: (1-ep)*-45 };
      case 'flipIn': return { op: ep, ox: 0, oy: 0, sc: 1, scaleY: ep };
      case 'blurIn': return { op: ep, ox: 0, oy: 0, sc: 1, blur: (1-ep)*12 };
      case 'glitchIn': {
        const gl = p < 0.7 ? Math.random()*((1-p/0.7)*15) : 0;
        return { op: Math.min(1,p*2), ox: gl*(Math.random()>0.5?1:-1), oy: gl*(Math.random()>0.5?1:-1)*0.5, sc: 1 };
      }
      case 'typewriter': return { op: 1, ox: 0, oy: 0, sc: 1, chars: Math.floor(p*(totalChars||1)) };
      case 'kenBurns': return { op: ep, ox: 0, oy: 0, sc: 1 + p*0.08 };
      default: return { op: 1, ox: 0, oy: 0, sc: 1 };
    }
  }

  /* ========== RENDER FRAME ========== */
  renderFrame(time) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    
    // Force reset canvas state to prevent ANY leakage from previous frames
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.filter = 'none';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.clearRect(0, 0, W, H);
    const total = this.getTotalDuration();
    if (total === 0) { this._empty(ctx, W, H); return; }
    const info = this.getSceneAtTime(Math.min(time, total));
    if (!info) { this._empty(ctx, W, H); return; }
    const { scene, localTime } = info;
    const dur = scene.duration;
    const fade = Math.min(localTime / 0.5, (dur - localTime) / 0.5, 1);

    ctx.save();
    try {
      ctx.globalAlpha = AnimationEngine.ease(Math.max(0, fade));
      this._bg(ctx, scene, W, H);

      if (this.isVertical()) this._vertical(ctx, scene, localTime, W, H);
      else this._horizontal(ctx, scene, localTime, W, H);
    } catch (err) {
      console.error("Lỗi khi dựng khung hình:", err);
    } finally {
      ctx.restore();
    }
  }

  _empty(ctx, W, H) {
    ctx.fillStyle = '#0d0d18'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#555'; ctx.font = '28px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Thêm cảnh để bắt đầu', W/2, H/2);
  }

  _bg(ctx, scene, W, H) {
    if (scene.bgImageObj) {
      const img = scene.bgImageObj;
      const s = Math.max(W/img.width, H/img.height);
      ctx.drawImage(img, (W-img.width*s)/2, (H-img.height*s)/2, img.width*s, img.height*s);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    } else if (scene.bgGradient) {
      const g = ctx.createLinearGradient(0, 0, W*0.3, H);
      g.addColorStop(0, scene.bgColor1||'#0f0c29');
      g.addColorStop(1, scene.bgColor2||'#302b63');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = scene.bgColor1||'#0f0c29'; ctx.fillRect(0, 0, W, H);
    }
  }

  /* ========== VERTICAL LAYOUT ========== */
  _vertical(ctx, scene, lt, W, H) {
    const pad = W * 0.08;
    const maxW = W - pad * 2;
    const safeTop = H * 0.06;
    const safeBot = H * 0.88;
    const imgPos = scene.imagePosition || 'fullscreen';

    // Draw fullscreen image as background
    if (scene.imageObj && imgPos === 'fullscreen') {
      this._drawFullscreenImage(ctx, scene, lt, W, H);
    }

    // Page counter (e.g. "1/10")
    if (scene.showPageCounter) {
      const scIdx = this.scenes.indexOf(scene);
      const total = this.scenes.length;
      const pcText = `${scIdx + 1}/${total}`;
      const pcFS = Math.round(W * 0.035);
      const pcX = pad;
      const pcY = H * 0.03;
      const accentColor = scene.highlightColor || '#d4622b';
      ctx.save();
      const pp = AnimationEngine.ease(Math.max(0, Math.min(1, lt / 0.5)));
      ctx.globalAlpha *= pp;
      ctx.font = `500 italic ${pcFS}px "${scene.titleFont || 'Be Vietnam Pro'}"`;
      ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillStyle = scene.titleLine1Color || '#1a2744';
      ctx.fillText(pcText, pcX, pcY);
      // Accent line below counter
      const lineY = pcY + pcFS + 8;
      ctx.fillStyle = accentColor;
      ctx.fillRect(pcX, lineY, W * 0.04, 4);
      ctx.restore();
    }

    // Measure title lines
    const titleLines = [];
    for (let i = 1; i <= 3; i++) {
      const txt = scene['titleLine' + i] || '';
      if (!txt) continue;
      const fs = scene['titleLine' + i + 'Size'] || 60;
      ctx.font = `800 ${fs}px "${scene.titleFont || 'Be Vietnam Pro'}"`;
      const wrapped = this.wrapText(ctx, txt, maxW);
      const lh = fs * 1.25;
      titleLines.push({ text: txt, wrapped, color: scene['titleLine' + i + 'Color'] || '#fff', align: scene['titleLine' + i + 'Align'] || 'center', fs, lh });
    }
    const tH = titleLines.reduce((s, tl) => s + tl.wrapped.length * tl.lh, 0);

    const cFS = scene.contentSize || 30;
    ctx.font = `400 ${cFS}px "${scene.contentFont || 'Inter'}"`;
    const cLines = scene.content ? this.wrapText(ctx, scene.content, maxW) : [];
    const cLineH = cFS * 1.6;
    const cH = cLines.length * cLineH;

    const accentH = scene.showAccent && titleLines.length ? 20 : 0;
    const tcGap = (titleLines.length && scene.content) ? 24 : 0;
    const totalTextH = tH + accentH + tcGap + cH;

    const pos = scene.textPosition || 'top';
    let textY;
    if (pos === 'center') {
      const imgEst = (scene.imageObj && imgPos === 'below') ? Math.min(H * 0.35, 400) + 24 : 0;
      textY = safeTop + (safeBot - safeTop - totalTextH - imgEst) / 2;
    } else if (pos === 'bottom') {
      const imgEst = (scene.imageObj && imgPos === 'below') ? Math.min(H * 0.35, 400) + 24 : 0;
      textY = safeBot - totalTextH - imgEst;
    } else {
      textY = safeTop;
    }
    textY = Math.max(safeTop, textY);

    // Draw title lines
    const t0 = scene.titleDelay != null ? scene.titleDelay : 0.3;
    const tDur = scene.titleAnimDur != null ? scene.titleAnimDur : 0.7;
    const hasTitle = titleLines.length > 0;
    if (hasTitle) {
      for (const tl of titleLines) {
        this._renderTitleLine(ctx, scene, lt, {
          lines: tl.wrapped, fs: tl.fs, color: tl.color, align: tl.align,
          anim: scene.titleAnimation || 'slideUp', t0, dur: tDur,
          lh: tl.lh, y: textY, cx: W / 2 + (scene.textOffsetX || 0), maxW, pad,
          ox: scene.textOffsetX || 0, oy: scene.textOffsetY || 0,
        });
        textY += tl.wrapped.length * tl.lh;
      }
    }

    if (scene.showAccent && hasTitle) {
      const aOx = scene.accentOffsetX || 0;
      const aOy = scene.accentOffsetY || 0;
      this._accentLine(ctx, scene, lt, W / 2 + (scene.textOffsetX || 0) + aOx, textY + 6 + aOy, maxW * 0.3);
      textY += accentH;
    }

    // Content
    const c0 = scene.contentDelay != null ? scene.contentDelay : 0.9;
    const cDur = scene.contentAnimDur != null ? scene.contentAnimDur : 0.8;
    if (scene.content) {
      const fwContent = scene.contentItalic ? 'italic 400' : '400';
      this._renderContent(ctx, scene, lt, {
        text: scene.content, lines: cLines, fs: cFS, fw: fwContent,
        ff: scene.contentFont || 'Inter', color: scene.contentColor || '#c8c8e0',
        anim: scene.contentAnimation || 'fadeIn', t0: c0, dur: cDur,
        lh: cLineH, y: textY + tcGap, cx: W / 2 + (scene.textOffsetX || 0), maxW, shadow: false,
        align: scene.contentAlign || 'center',
        ox: scene.textOffsetX || 0, oy: scene.textOffsetY || 0,
      });
    }

    // Non-fullscreen image
    if (scene.imageObj && imgPos !== 'fullscreen') {
      if (imgPos === 'below') {
        this._vImage(ctx, scene, lt, W, H, textY + 24, safeBot);
      } else {
        this._positionedImage(ctx, scene, lt, W, H, imgPos);
      }
    }
  }

  _drawFullscreenImage(ctx, scene, lt, W, H) {
    const p = Math.max(0, Math.min(1, (lt - 0.2) / 0.8));
    const a = this.getAnim(scene.imageAnimation || 'fadeIn', p);
    if (a.op <= 0) return;
    const img = scene.imageObj;
    if (!img || !img.width || !img.height) return;
    ctx.save();
    try {
      const scale = (scene.imageScale || 100) / 100;
      const ox = scene.imageOffsetX || 0;
      const oy = scene.imageOffsetY || 0;
      const s = Math.max(W / img.width, H / img.height) * scale;
      ctx.globalAlpha *= a.op;
      ctx.drawImage(img, (W - img.width * s) / 2 + ox, (H - img.height * s) / 2 + oy, img.width * s, img.height * s);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
    } catch (e) {
      console.warn("Lỗi vẽ ảnh nền:", e);
    } finally {
      ctx.restore();
    }
  }

  _positionedImage(ctx, scene, lt, W, H, pos) {
    if (!scene.imageObj) return;
    const p = Math.max(0, Math.min(1, (lt - 0.7) / 0.8));
    const a = this.getAnim(scene.imageAnimation || 'fadeIn', p);
    if (a.op <= 0) return;
    const img = scene.imageObj;
    if (!img.width || !img.height) return;
    ctx.save();
    try {
      const scale = (scene.imageScale || 100) / 100;
      const ox = scene.imageOffsetX || 0;
      const oy = scene.imageOffsetY || 0;
      const maxImgW = W * 0.84;
      const maxImgH = H * 0.4;
      let iW = Math.min(img.width, maxImgW) * scale;
      let iH = iW * (img.height / img.width);
      if (iH > maxImgH) { iH = maxImgH; iW = iH * (img.width / img.height); }
      const iX = (W - iW) / 2 + ox;
      let iY;
      if (pos === 'top') iY = H * 0.06 + oy;
      else if (pos === 'bottom') iY = H * 0.88 - iH + oy;
      else iY = (H - iH) / 2 + oy;
      ctx.globalAlpha *= a.op;
      ctx.translate(iX + iW / 2 + a.ox, iY + iH / 2 + a.oy);
      ctx.scale(a.sc, a.sc);
      ctx.beginPath(); ctx.roundRect(-iW / 2, -iH / 2, iW, iH, 20); ctx.clip();
      ctx.drawImage(img, -iW / 2, -iH / 2, iW, iH);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
    } catch (e) {
      console.warn("Lỗi vẽ ảnh positioned:", e);
    } finally {
      ctx.restore();
    }
  }

  _vImage(ctx, scene, lt, W, H, topY, botY) {
    if (!scene.imageObj) return;
    const p = Math.max(0, Math.min(1, (lt - 0.7) / 0.8));
    const a = this.getAnim(scene.imageAnimation || 'fadeIn', p);
    if (a.op <= 0) return;
    const img = scene.imageObj;
    if (!img.width || !img.height) return;
    ctx.save();
    try {
      const scale = (scene.imageScale || 100) / 100;
      const ox = scene.imageOffsetX || 0;
      const oy = scene.imageOffsetY || 0;
      const maxImgW = W * 0.84;
      const maxImgH = Math.min(botY - topY, H * 0.45);
      let iW = Math.min(img.width, maxImgW) * scale;
      let iH = iW * (img.height / img.width);
      if (iH > maxImgH) { iH = maxImgH; iW = iH * (img.width / img.height); }
      const iX = (W - iW) / 2 + ox, iY = topY + oy;
      ctx.globalAlpha *= a.op;
      ctx.translate(iX + iW / 2 + a.ox, iY + iH / 2 + a.oy);
      ctx.scale(a.sc, a.sc);
      ctx.beginPath(); ctx.roundRect(-iW / 2, -iH / 2, iW, iH, 20); ctx.clip();
      ctx.drawImage(img, -iW / 2, -iH / 2, iW, iH);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
    } catch (e) {
      console.warn("Lỗi vẽ ảnh vImage:", e);
    } finally {
      ctx.restore();
    }
  }

  _renderTitleLine(ctx, scene, lt, o) {
    const p = Math.max(0, Math.min(1, (lt - o.t0) / o.dur));
    const plainText = o.lines.join('').replace(/\*/g, '');
    const a = this.getAnim(o.anim, p, plainText.length);
    if (a.op <= 0) return;
    ctx.save();
    try {
      ctx.globalAlpha *= a.op;
      ctx.translate(a.ox + (o.ox || 0), a.oy + (o.oy || 0));
      if (a.sc !== 1) {
        const cy = o.y + (o.lines.length * o.lh) / 2;
        ctx.translate(o.cx, cy); ctx.scale(a.sc, a.sc); ctx.translate(-o.cx, -cy);
      }
      if (a.rot) {
        const cy = o.y + (o.lines.length * o.lh) / 2;
        ctx.translate(o.cx, cy); ctx.rotate(a.rot * Math.PI / 180); ctx.translate(-o.cx, -cy);
      }
      if (a.scaleY != null && a.scaleY !== 1) {
        const cy = o.y + (o.lines.length * o.lh) / 2;
        ctx.translate(o.cx, cy); ctx.scale(1, a.scaleY); ctx.translate(-o.cx, -cy);
      }
      const hlColor = scene.highlightColor || '#d4622b';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const font = scene.titleFont || 'Be Vietnam Pro';
      let gci = 0;
      for (let i = 0; i < o.lines.length; i++) {
        const ly = o.y + i * o.lh;
        const segs = this.parseRichSegments(o.lines[i]);
        // Calculate total line width for alignment
        let totalW = 0;
        for (const seg of segs) {
          ctx.font = `800 ${o.fs}px "${font}"`;
          totalW += ctx.measureText(seg.text).width;
        }
        let dx;
        if (o.align === 'left') dx = o.pad;
        else if (o.align === 'right') dx = o.cx * 2 - o.pad - totalW;
        else dx = o.cx - totalW / 2;
        for (const seg of segs) {
          ctx.font = `800 ${o.fs}px "${font}"`;
          let dt = seg.text;
          if (a.chars !== undefined) {
            const avail = a.chars - gci;
            if (avail <= 0) { gci += seg.text.length; continue; }
            dt = seg.text.substring(0, Math.min(seg.text.length, avail));
          }
          ctx.fillStyle = seg.hl ? hlColor : o.color;
          if (seg.hl) {
            ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          } else {
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
          }
          ctx.fillText(dt, dx, ly);
          dx += ctx.measureText(seg.text).width;
          gci += seg.text.length;
        }
      }
    } finally {
      ctx.restore();
    }
  }



  /* --- Accent line --- */
  _accentLine(ctx, scene, lt, cx, y, w) {
    const p = AnimationEngine.ease(Math.max(0, Math.min(1, (lt - 0.8) / 0.6)));
    if (p <= 0) return;
    const drawW = w * p;
    ctx.save();
    try {
      ctx.globalAlpha *= p;
      ctx.fillStyle = scene.highlightColor || scene.titleLine1Color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.roundRect(cx - drawW/2, y, drawW, 6, 3); ctx.fill();
    } finally {
      ctx.restore();
    }
  }

  /* --- Centered text rendering --- */
  /* --- Content text rendering with custom alignment & highlight support --- */
  _renderContent(ctx, scene, lt, o) {
    const p = Math.max(0, Math.min(1, (lt - o.t0) / o.dur));
    const a = this.getAnim(o.anim, p, o.text.length);
    if (a.op <= 0) return;

    ctx.save();
    try {
      ctx.globalAlpha *= a.op;
      ctx.translate(a.ox + (o.ox || 0), a.oy + (o.oy || 0));

      if (a.sc !== 1) {
        const centerY = o.y + (o.lines.length * o.lh) / 2;
        ctx.translate(o.cx, centerY);
        ctx.scale(a.sc, a.sc);
        ctx.translate(-o.cx, -centerY);
      }

      if (o.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
      }

      ctx.font = `${o.fw} ${o.fs}px "${o.ff}"`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const hlColor = scene.highlightColor || '#d4622b';
      const pad = o.cx - o.maxW / 2;
      const align = o.align || 'center';

      let gci = 0;
      for (let i = 0; i < o.lines.length; i++) {
        const ly = o.y + i * o.lh;
        const segs = this.parseRichSegments(o.lines[i]);
        
        // Calculate total line width for alignment
        let totalW = 0;
        for (const seg of segs) {
          const weight = seg.hl ? '700' : o.fw;
          ctx.font = `${weight} ${o.fs}px "${o.ff}"`;
          totalW += ctx.measureText(seg.text).width;
        }

        let dx;
        if (align === 'left') {
          dx = pad;
        } else if (align === 'right') {
          dx = o.cx * 2 - pad - totalW;
        } else {
          dx = o.cx - totalW / 2;
        }

        for (const seg of segs) {
          const weight = seg.hl ? '700' : o.fw;
          ctx.font = `${weight} ${o.fs}px "${o.ff}"`;
          let dt = seg.text;
          
          if (a.chars !== undefined) {
            const avail = a.chars - gci;
            if (avail <= 0) {
              gci += seg.text.length;
              continue;
            }
            dt = seg.text.substring(0, Math.min(seg.text.length, avail));
          }

          ctx.fillStyle = seg.hl ? hlColor : o.color;
          if (seg.hl) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          } else if (o.shadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
          }
          
          ctx.fillText(dt, dx, ly);
          dx += ctx.measureText(seg.text).width;
          gci += seg.text.length;
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /* ========== HORIZONTAL LAYOUT ========== */
  _horizontal(ctx, scene, lt, W, H) {
    if (scene.imageObj) this._hImage(ctx, scene, lt, W, H);
    const hasImg = !!scene.imageObj;
    const maxW = hasImg ? W*0.44 : W*0.75;
    const startX = W * 0.08 + (scene.textOffsetX || 0);
    const textY = (scene.textOffsetY || 0);

    // Measure title lines
    const titleLines = [];
    for (let i = 1; i <= 3; i++) {
      const txt = scene['titleLine' + i] || '';
      if (!txt) continue;
      const fs = scene['titleLine' + i + 'Size'] || 60;
      ctx.font = `800 ${fs}px "${scene.titleFont || 'Be Vietnam Pro'}"`;
      const wrapped = this.wrapText(ctx, txt, maxW);
      const lh = fs * 1.25;
      titleLines.push({ text: txt, wrapped, color: scene['titleLine' + i + 'Color'] || '#fff', fs, lh });
    }
    const tH = titleLines.reduce((s, tl) => s + tl.wrapped.length * tl.lh, 0);

    const cFS = scene.contentSize || 30;
    ctx.font = `400 ${cFS}px "${scene.contentFont || 'Inter'}"`;
    const cLines = scene.content ? this.wrapText(ctx, scene.content, maxW) : [];
    const cLineH = cFS * 1.6;
    const cH = cLines.length * cLineH;

    const accentH = scene.showAccent && titleLines.length ? 20 : 0;
    const tcGap = (titleLines.length && scene.content) ? 30 : 0;
    const totalTextH = tH + accentH + tcGap + cH;

    let sy = (H - totalTextH) / 2 + textY;
    sy = Math.max(H * 0.1, sy);

    // Draw title lines
    const t0 = scene.titleDelay != null ? scene.titleDelay : 0.3;
    const tDur = scene.titleAnimDur != null ? scene.titleAnimDur : 0.7;
    const hasTitle = titleLines.length > 0;
    if (hasTitle) {
      for (const tl of titleLines) {
        this._richTextH(ctx, scene, lt, {
          lines: tl.wrapped, fs: tl.fs, fw: '800', ff: scene.titleFont || 'Be Vietnam Pro',
          color: tl.color, anim: scene.titleAnimation || 'slideUp',
          t0, dur: tDur, lh: tl.lh, y: sy, x: startX,
          hlColor: scene.highlightColor || '#ff6b35', shadow: true,
          text: tl.text,
          ox: scene.textOffsetX || 0, oy: scene.textOffsetY || 0,
        });
        sy += tl.wrapped.length * tl.lh;
      }
    }

    if (scene.showAccent && hasTitle) {
      this._accentLineH(ctx, scene, lt, startX, sy + 8, maxW * 0.25);
      sy += accentH;
    }

    // Content
    const c0 = scene.contentDelay != null ? scene.contentDelay : 0.9;
    const cDur = scene.contentAnimDur != null ? scene.contentAnimDur : 0.8;
    if (scene.content) {
      this._richTextH(ctx, scene, lt, {
        lines: cLines, fs: cFS, fw: '400', ff: scene.contentFont || 'Inter',
        color: scene.contentColor || '#c8c8e0', anim: scene.contentAnimation || 'fadeIn',
        t0: c0, dur: cDur, lh: cLineH, y: sy + tcGap, x: startX,
        hlColor: scene.highlightColor || '#ff6b35', shadow: false,
        text: scene.content,
        ox: scene.textOffsetX || 0, oy: scene.textOffsetY || 0,
      });
    }
  }

  _hImage(ctx, scene, lt, W, H) {
    const p = Math.max(0,Math.min(1,(lt-0.8)/0.8));
    const a = this.getAnim(scene.imageAnimation||'fadeIn', p);
    if (a.op <= 0) return;
    const img = scene.imageObj, hasText = scene.title||scene.content;
    let iW, iH, iX, iY;
    if (hasText) {
      iW=Math.min(img.width,W*0.42); iH=iW*(img.height/img.width);
      if(iH>H*0.65){iH=H*0.65;iW=iH*(img.width/img.height);}
      iX=W-iW-W*0.06; iY=(H-iH)/2;
    } else {
      iW=Math.min(img.width,W*0.7); iH=iW*(img.height/img.width);
      if(iH>H*0.75){iH=H*0.75;iW=iH*(img.width/img.height);}
      iX=(W-iW)/2; iY=(H-iH)/2;
    }
    ctx.save();
    try {
      ctx.globalAlpha*=a.op;
      ctx.translate(iX+iW/2+a.ox,iY+iH/2+a.oy); ctx.scale(a.sc,a.sc);
      ctx.beginPath(); ctx.roundRect(-iW/2,-iH/2,iW,iH,16); ctx.clip();
      ctx.drawImage(img,-iW/2,-iH/2,iW,iH);
    } finally {
      ctx.restore();
    }
  }

  /* --- Left-aligned rich text for horizontal --- */
  _richTextH(ctx, scene, lt, o) {
    const p = Math.max(0,Math.min(1,(lt-o.t0)/o.dur));
    const plain = o.text.replace(/\*/g,'');
    const a = this.getAnim(o.anim, p, plain.length);
    if (a.op <= 0) return;
    ctx.save();
    try {
      ctx.globalAlpha *= a.op;
      ctx.translate(a.ox + (o.ox || 0), a.oy + (o.oy || 0));
      if (o.shadow) { ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=10; ctx.shadowOffsetY=3; }
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      let gci = 0;
      for (let i = 0; i < o.lines.length; i++) {
        const ly = o.y + i * o.lh;
        const segs = this.parseRichSegments(o.lines[i]);
        let dx = o.x;
        for (const seg of segs) {
          const sfs = seg.hl ? Math.round(o.fs*1.05) : o.fs;
          ctx.font = `${seg.hl?'700':o.fw} ${sfs}px "${o.ff}"`;
          let dt = seg.text;
          if (a.chars !== undefined) {
            const avail = a.chars - gci;
            if (avail <= 0) { gci += seg.text.length; continue; }
            dt = seg.text.substring(0, Math.min(seg.text.length, avail));
          }
          const sw = ctx.measureText(dt).width;
          if (seg.hl && dt.length > 0) {
            ctx.save(); ctx.shadowBlur=0;
            ctx.fillStyle=o.hlColor; ctx.globalAlpha*=0.92;
            ctx.beginPath(); ctx.roundRect(dx-6,ly-3,sw+12,sfs*1.2+6,6); ctx.fill();
            ctx.restore();
            ctx.fillStyle='#fff';
          } else {
            ctx.fillStyle = o.color;
          }
          ctx.fillText(dt, dx, ly);
          dx += ctx.measureText(seg.text).width;
          gci += seg.text.length;
        }
      }
    } finally {
      ctx.restore();
    }
  }

  _accentLineH(ctx, scene, lt, x, y, w) {
    const p = AnimationEngine.ease(Math.max(0,Math.min(1,(lt-0.8)/0.6)));
    if (p <= 0) return;
    ctx.save();
    try {
      ctx.globalAlpha *= p;
      ctx.fillStyle = scene.highlightColor||'#ff6b35';
      const aOx = scene.accentOffsetX || 0;
      const aOy = scene.accentOffsetY || 0;
      ctx.beginPath(); ctx.roundRect(x + aOx, y + aOy, w*p, 4, 2); ctx.fill();
    } finally {
      ctx.restore();
    }
  }

  /* ========== PLAYBACK ========== */
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._lastTimestamp = performance.now();
    this._tick();
  }
  pause() { this.isPlaying=false; if(this._rafId){cancelAnimationFrame(this._rafId);this._rafId=null;} }
  stop() { this.pause(); this.currentTime=0; this.renderFrame(0); if(this.onTimeUpdate)this.onTimeUpdate(0,this.getTotalDuration()); }
  seekTo(t) { this.currentTime=Math.max(0,Math.min(t,this.getTotalDuration())); this.renderFrame(this.currentTime); if(this.onTimeUpdate)this.onTimeUpdate(this.currentTime,this.getTotalDuration()); }

  _tick() {
    if (!this.isPlaying) return;
    const now = performance.now();
    this.currentTime += (now - this._lastTimestamp) / 1000;
    this._lastTimestamp = now;
    const total = this.getTotalDuration();
    if (this.currentTime >= total) {
      this.currentTime = total; this.renderFrame(total); this.pause();
      if(this.onTimeUpdate)this.onTimeUpdate(total,total);
      if(this.onPlaybackEnd)this.onPlaybackEnd();
      return;
    }
    this.renderFrame(this.currentTime);
    if(this.onTimeUpdate)this.onTimeUpdate(this.currentTime,total);
    this._rafId = requestAnimationFrame(() => this._tick());
  }
}
