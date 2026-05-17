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


  /* --- Animation value --- */
  getAnim(type, progress, totalChars) {
    const p = Math.max(0, Math.min(1, progress));
    const ep = AnimationEngine.ease(p);
    switch (type) {
      case 'fadeIn': return { op: ep, ox: 0, oy: 0, sc: 1 };
      case 'slideUp': return { op: ep, ox: 0, oy: (1-ep)*60, sc: 1 };
      case 'slideDown': return { op: ep, ox: 0, oy: -(1-ep)*60, sc: 1 };
      case 'slideLeft': return { op: ep, ox: (1-ep)*80, oy: 0, sc: 1 };
      case 'scaleIn': return { op: ep, ox: 0, oy: 0, sc: 0.5 + AnimationEngine.easeBack(p)*0.5 };
      case 'typewriter': return { op: 1, ox: 0, oy: 0, sc: 1, chars: Math.floor(p*(totalChars||1)) };
      case 'kenBurns': return { op: ep, ox: 0, oy: 0, sc: 1 + p*0.08 };
      default: return { op: 1, ox: 0, oy: 0, sc: 1 };
    }
  }

  /* ========== RENDER FRAME ========== */
  renderFrame(time) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const total = this.getTotalDuration();
    if (total === 0) { this._empty(ctx, W, H); return; }
    const info = this.getSceneAtTime(Math.min(time, total));
    if (!info) { this._empty(ctx, W, H); return; }
    const { scene, localTime } = info;
    const dur = scene.duration;
    const fade = Math.min(localTime / 0.5, (dur - localTime) / 0.5, 1);

    ctx.save();
    ctx.globalAlpha = AnimationEngine.ease(Math.max(0, fade));
    this._bg(ctx, scene, W, H);

    if (this.isVertical()) this._vertical(ctx, scene, localTime, W, H);
    else this._horizontal(ctx, scene, localTime, W, H);
    ctx.restore();
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
  /* Text on TOP (badge → title → accent → content), Image BELOW */
  _vertical(ctx, scene, lt, W, H) {
    const pad = W * 0.08;
    const maxW = W - pad * 2;
    const safeTop = H * 0.06;
    const safeBot = H * 0.88;

    const tFS = scene.titleSize || 60;
    const cFS = scene.contentSize || 30;
    ctx.font = `800 ${tFS}px "${scene.titleFont||'Be Vietnam Pro'}"`;
    const tLines = scene.title ? this.wrapText(ctx, scene.title, maxW) : [];
    const tLineH = tFS * 1.25;
    const tH = tLines.length * tLineH;
    ctx.font = `400 ${cFS}px "${scene.contentFont||'Inter'}"`;
    const cLines = scene.content ? this.wrapText(ctx, scene.content, maxW) : [];
    const cLineH = cFS * 1.6;
    const cH = cLines.length * cLineH;

    const accentH = scene.showAccent ? 20 : 0;
    const tcGap = (scene.title && scene.content) ? 24 : 0;
    const totalTextH = tH + accentH + tcGap + cH;

    const pos = scene.textPosition || 'top';
    let textY;
    if (pos === 'center') {
      const imgEst = scene.imageObj ? Math.min(H * 0.35, 400) + 24 : 0;
      textY = safeTop + (safeBot - safeTop - totalTextH - imgEst) / 2;
    } else {
      textY = safeTop;
    }
    textY = Math.max(safeTop, textY);

    if (scene.title) {
      this._centeredText(ctx, scene, lt, {
        text: scene.title, lines: tLines, fs: tFS, fw: '800',
        ff: scene.titleFont||'Be Vietnam Pro', color: scene.titleColor||'#fff',
        anim: scene.titleAnimation||'slideUp', t0: 0.3, dur: 0.7,
        lh: tLineH, y: textY, cx: W/2, maxW, shadow: true,
      });
      textY += tH;
    }
    if (scene.showAccent && scene.title) {
      this._accentLine(ctx, scene, lt, W/2, textY + 6, maxW * 0.3);
      textY += accentH;
    }
    if (scene.content) {
      this._centeredText(ctx, scene, lt, {
        text: scene.content, lines: cLines, fs: cFS, fw: '400',
        ff: scene.contentFont||'Inter', color: scene.contentColor||'#c8c8e0',
        anim: scene.contentAnimation||'fadeIn', t0: 0.9, dur: 0.8,
        lh: cLineH, y: textY + tcGap, cx: W/2, maxW, shadow: false,
      });
      textY += tcGap + cH;
    }
    if (scene.imageObj) {
      this._vImage(ctx, scene, lt, W, H, textY + 24, safeBot);
    }
  }

  _vImage(ctx, scene, lt, W, H, topY, botY) {
    if (!scene.imageObj) return;
    const p = Math.max(0, Math.min(1, (lt - 0.7) / 0.8));
    const a = this.getAnim(scene.imageAnimation||'fadeIn', p);
    if (a.op <= 0) return;
    const img = scene.imageObj;
    const maxImgW = W * 0.84;
    const maxImgH = Math.min(botY - topY, H * 0.45);
    let iW = Math.min(img.width, maxImgW);
    let iH = iW * (img.height / img.width);
    if (iH > maxImgH) { iH = maxImgH; iW = iH * (img.width / img.height); }
    const iX = (W - iW) / 2, iY = topY;
    ctx.save(); ctx.globalAlpha *= a.op;
    ctx.translate(iX + iW/2 + a.ox, iY + iH/2 + a.oy);
    ctx.scale(a.sc, a.sc);
    ctx.beginPath(); ctx.roundRect(-iW/2, -iH/2, iW, iH, 20); ctx.clip();
    ctx.drawImage(img, -iW/2, -iH/2, iW, iH);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }


  /* --- Accent line --- */
  _accentLine(ctx, scene, lt, cx, y, w) {
    const p = AnimationEngine.ease(Math.max(0, Math.min(1, (lt - 0.8) / 0.6)));
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    const color = scene.titleColor || '#ffffff';
    const drawW = w * p;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(cx - drawW/2, y, drawW, 6, 3); ctx.fill();
    ctx.restore();
  }

  /* --- Centered text rendering --- */
  _centeredText(ctx, scene, lt, o) {
    const p = Math.max(0, Math.min(1, (lt - o.t0) / o.dur));
    const a = this.getAnim(o.anim, p, o.text.length);
    if (a.op <= 0) return;

    ctx.save();
    ctx.globalAlpha *= a.op;
    ctx.translate(a.ox, a.oy);

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
    ctx.textAlign = 'center';
    ctx.fillStyle = o.color;

    if (a.chars !== undefined) {
      // Typewriter
      ctx.textAlign = 'left';
      const startX = o.cx - o.maxW / 2;
      let cc = 0;
      for (let i = 0; i < o.lines.length; i++) {
        const vis = Math.max(0, Math.min(o.lines[i].length, a.chars - cc));
        if (vis > 0) ctx.fillText(o.lines[i].substring(0, vis), startX, o.y + i * o.lh);
        cc += o.lines[i].length;
      }
    } else {
      for (let i = 0; i < o.lines.length; i++) {
        ctx.fillText(o.lines[i], o.cx, o.y + i * o.lh);
      }
    }
    ctx.restore();
  }

  /* ========== HORIZONTAL LAYOUT ========== */
  _horizontal(ctx, scene, lt, W, H) {
    if (scene.imageObj) this._hImage(ctx, scene, lt, W, H);
    const hasImg = !!scene.imageObj;
    const maxW = hasImg ? W*0.44 : W*0.75;
    const startX = W * 0.08;

    let curY = 0;

    // Title
    if (scene.title) {
      const fs = scene.titleSize||60;
      ctx.font = `800 ${fs}px "${scene.titleFont||'Be Vietnam Pro'}"`;
      const lines = this.wrapText(ctx, scene.title, maxW);
      const lh = fs * 1.2, totalH = lines.length * lh;
      let sy = scene.content ? H*0.22 + curY : (H-totalH)/2;
      this._richTextH(ctx, scene, lt, {
        lines, fs, fw:'800', ff:scene.titleFont||'Be Vietnam Pro',
        color:scene.titleColor||'#fff', anim:scene.titleAnimation||'slideUp',
        t0:0.3, dur:0.7, lh, y:sy, x:startX,
        hlColor:scene.highlightColor||'#ff6b35', shadow:true,
        text: scene.title,
      });

      if (scene.showAccent) {
        this._accentLineH(ctx, scene, lt, startX, sy+totalH+8, maxW*0.25);
      }
    }

    // Content
    if (scene.content) {
      const fs = scene.contentSize||30;
      ctx.font = `400 ${fs}px "${scene.contentFont||'Inter'}"`;
      const lines = this.wrapText(ctx, scene.content, maxW);
      const titleFS = scene.titleSize||60;
      ctx.font = `800 ${titleFS}px "${scene.titleFont||'Be Vietnam Pro'}"`;
      const tLines = scene.title ? this.wrapText(ctx, scene.title, maxW) : [];
      const tH = tLines.length * titleFS * 1.2;
      ctx.font = `400 ${fs}px "${scene.contentFont||'Inter'}"`;
      let sy = scene.title ? H*0.22+curY+tH+30+(scene.showAccent?20:0) : H*0.3;
      this._richTextH(ctx, scene, lt, {
        lines, fs, fw:'400', ff:scene.contentFont||'Inter',
        color:scene.contentColor||'#c8c8e0', anim:scene.contentAnimation||'fadeIn',
        t0:0.9, dur:0.8, lh:fs*1.6, y:sy, x:startX,
        hlColor:scene.highlightColor||'#ff6b35', shadow:false,
        text: scene.content,
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
    ctx.save(); ctx.globalAlpha*=a.op;
    ctx.translate(iX+iW/2+a.ox,iY+iH/2+a.oy); ctx.scale(a.sc,a.sc);
    ctx.beginPath(); ctx.roundRect(-iW/2,-iH/2,iW,iH,16); ctx.clip();
    ctx.drawImage(img,-iW/2,-iH/2,iW,iH);
    ctx.restore();
  }

  /* --- Left-aligned rich text for horizontal --- */
  _richTextH(ctx, scene, lt, o) {
    const p = Math.max(0,Math.min(1,(lt-o.t0)/o.dur));
    const plain = o.text.replace(/\*/g,'');
    const a = this.getAnim(o.anim, p, plain.length);
    if (a.op <= 0) return;
    ctx.save(); ctx.globalAlpha *= a.op;
    ctx.translate(a.ox, a.oy);
    if (o.shadow) { ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=10; ctx.shadowOffsetY=3; }
    ctx.textBaseline = 'top';
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
        } else ctx.fillStyle = o.color;
        ctx.fillText(dt, dx, ly);
        dx += ctx.measureText(seg.text).width;
        gci += seg.text.length;
      }
    }
    ctx.restore();
  }

  _accentLineH(ctx, scene, lt, x, y, w) {
    const p = AnimationEngine.ease(Math.max(0,Math.min(1,(lt-0.8)/0.6)));
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    ctx.fillStyle = scene.highlightColor||'#ff6b35';
    ctx.beginPath(); ctx.roundRect(x, y, w*p, 4, 2); ctx.fill();
    ctx.restore();
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
