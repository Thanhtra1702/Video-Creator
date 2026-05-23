/**
 * App - Main application controller with 3 title lines, image controls, animation timing
 */
(function() {
  'use strict';

  let scenes = [];
  let activeSceneIndex = 0;
  let engine, exporter;

  function createDefaultScene() {
    return {
      id: Date.now() + Math.random(),
      titleLine1: '', titleLine1Color: '#1a2744', titleLine1Align: 'center', titleLine1Size: 60,
      titleLine2: '', titleLine2Color: '#1a2744', titleLine2Align: 'center', titleLine2Size: 60,
      titleLine3: '', titleLine3Color: '#1a2744', titleLine3Align: 'center', titleLine3Size: 48,
      content: '',
      imageSrc: null, imageObj: null,
      imagePosition: 'fullscreen', imageScale: 100,
      imageOffsetX: 0, imageOffsetY: 0,
      bgColor1: '#ffffff', bgColor2: '#f0f0f0', bgGradient: false, bgImageObj: null,
      duration: 5,
      titleAnimation: 'slideUp', contentAnimation: 'fadeIn',
      imageAnimation: 'fadeIn', sceneTransition: 'fade',
      titleFont: 'Be Vietnam Pro',
      contentFont: 'Inter', contentSize: 30, contentColor: '#333333', contentItalic: false,
      showAccent: true, showPageCounter: false, highlightColor: '#d4622b', textPosition: 'top',
      titleDelay: 0.3, titleAnimDur: 0.7,
      contentDelay: 0.9, contentAnimDur: 0.8,
    };
  }

  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#previewCanvas');

  const els = {
    sceneList: $('#sceneList'),
    titleLine1: $('#titleLine1'), titleLine1Color: $('#titleLine1Color'), titleLine1Align: $('#titleLine1Align'), titleLine1Size: $('#titleLine1Size'), titleLine1SizeVal: $('#titleLine1SizeVal'),
    titleLine2: $('#titleLine2'), titleLine2Color: $('#titleLine2Color'), titleLine2Align: $('#titleLine2Align'), titleLine2Size: $('#titleLine2Size'), titleLine2SizeVal: $('#titleLine2SizeVal'),
    titleLine3: $('#titleLine3'), titleLine3Color: $('#titleLine3Color'), titleLine3Align: $('#titleLine3Align'), titleLine3Size: $('#titleLine3Size'), titleLine3SizeVal: $('#titleLine3SizeVal'),
    sceneContent: $('#sceneContent'),
    sceneImage: $('#sceneImage'), imageUploadArea: $('#imageUploadArea'),
    uploadPlaceholder: $('#uploadPlaceholder'),
    imagePreview: $('#imagePreview'), btnRemoveImage: $('#btnRemoveImage'),
    imagePosition: $('#imagePosition'), imagePositionGroup: $('#imagePositionGroup'),
    imageScale: $('#imageScale'), imageScaleVal: $('#imageScaleVal'), imageScaleGroup: $('#imageScaleGroup'),
    imageOffsetX: $('#imageOffsetX'), imageOffsetXVal: $('#imageOffsetXVal'),
    imageOffsetY: $('#imageOffsetY'), imageOffsetYVal: $('#imageOffsetYVal'),
    imageOffsetGroup: $('#imageOffsetGroup'), btnResetImageOffset: $('#btnResetImageOffset'),
    sceneBgColor1: $('#sceneBgColor1'), sceneBgColor2: $('#sceneBgColor2'),
    sceneBgGradient: $('#sceneBgGradient'),
    showAccent: $('#showAccent'), showPageCounter: $('#showPageCounter'),
    highlightColor: $('#highlightColor'), contentItalic: $('#contentItalic'),
    textPosition: $('#textPosition'),
    sceneDuration: $('#sceneDuration'), durationValue: $('#durationValue'),
    titleAnimation: $('#titleAnimation'), contentAnimation: $('#contentAnimation'),
    imageAnimation: $('#imageAnimation'), sceneTransition: $('#sceneTransition'),
    titleFont: $('#titleFont'),
    contentFont: $('#contentFont'), contentSize: $('#contentSize'), contentSizeVal: $('#contentSizeVal'),
    contentColor: $('#contentColor'),
    contentDelay: $('#contentDelay'), contentDelayVal: $('#contentDelayVal'),
    contentAnimDur: $('#contentAnimDur'), contentAnimDurVal: $('#contentAnimDurVal'),
    titleDelay: $('#titleDelay'), titleDelayVal: $('#titleDelayVal'),
    titleAnimDur: $('#titleAnimDur'), titleAnimDurVal: $('#titleAnimDurVal'),
    exportResolution: $('#exportResolution'), exportFPS: $('#exportFPS'),
    btnAddScene: $('#btnAddScene'), btnPreview: $('#btnPreview'), btnExport: $('#btnExport'),
    btnPlay: $('#btnPlay'), btnStop: $('#btnStop'),
    playIcon: $('#playIcon'), pauseIcon: $('#pauseIcon'),
    progressBar: $('#progressBar'), progressFill: $('#progressFill'), timeDisplay: $('#timeDisplay'),
    exportModal: $('#exportModal'), exportModalTitle: $('#exportModalTitle'),
    exportProgressBar: $('#exportProgressBar'), exportPercent: $('#exportPercent'),
    exportStatus: $('#exportStatus'), btnCancelExport: $('#btnCancelExport'), btnDownload: $('#btnDownload'),
  };

  function init() {
    engine = new AnimationEngine(canvas);
    exporter = new VideoExporter(engine);

    const s1 = createDefaultScene();
    s1.titleLine1 = 'Chào mừng';
    s1.titleLine2 = 'Video Creator';
    s1.content = 'Công cụ tạo video từ nội dung văn bản và hình ảnh.\nThêm cảnh, chỉnh sửa, và xuất MP4.';
    scenes.push(s1);
    engine.scenes = scenes;

    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    setupEvents();
    renderSceneList();
    selectScene(0);
    document.fonts.ready.then(() => refreshPreview());
  }

  function fitCanvas() {
    const container = $('#canvasContainer');
    const wrapper = container.parentElement;
    const maxW = wrapper.clientWidth - 40;
    const maxH = wrapper.clientHeight - 40;
    const aspect = canvas.width / canvas.height;
    let w, h;
    if (maxW / maxH > aspect) { h = maxH; w = h * aspect; }
    else { w = maxW; h = w / aspect; }
    container.style.width = Math.max(200, w) + 'px';
    container.style.height = Math.max(120, h) + 'px';
  }

  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    $('#toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function renderSceneList() {
    els.sceneList.innerHTML = '';
    scenes.forEach((sc, i) => {
      const item = document.createElement('div');
      item.className = 'scene-item' + (i === activeSceneIndex ? ' active' : '');

      const thumb = document.createElement('canvas');
      thumb.width = 96; thumb.height = 54; thumb.className = 'scene-thumb';
      const tc = thumb.getContext('2d');
      if (sc.bgGradient) {
        const g = tc.createLinearGradient(0,0,96,54);
        g.addColorStop(0, sc.bgColor1); g.addColorStop(1, sc.bgColor2);
        tc.fillStyle = g;
      } else tc.fillStyle = sc.bgColor1;
      tc.fillRect(0, 0, 96, 54);
      tc.fillStyle = '#fff'; tc.font = '7px Inter';
      const displayText = sc.titleLine1 || sc.titleLine2 || sc.titleLine3 || '';
      tc.fillText(displayText.substring(0,15), 4, 28);

      const info = document.createElement('div');
      info.className = 'scene-item-info';
      const title = displayText || 'Cảnh ' + (i+1);
      info.innerHTML = `<div class="scene-item-title">${title}</div><div class="scene-item-duration">${sc.duration}s</div>`;

      const del = document.createElement('button');
      del.className = 'scene-item-delete'; del.textContent = '✕';
      del.onclick = (e) => { e.stopPropagation(); deleteScene(i); };

      item.appendChild(thumb); item.appendChild(info); item.appendChild(del);
      item.onclick = () => selectScene(i);
      els.sceneList.appendChild(item);
    });
  }

  function selectScene(index) {
    if (index < 0 || index >= scenes.length) return;
    activeSceneIndex = index;
    const sc = scenes[index];

    els.titleLine1.value = sc.titleLine1 || '';
    els.titleLine1Color.value = sc.titleLine1Color || '#ffffff';
    els.titleLine1Align.value = sc.titleLine1Align || 'center';
    els.titleLine1Size.value = sc.titleLine1Size || 60;
    els.titleLine1SizeVal.textContent = sc.titleLine1Size || 60;
    els.titleLine2.value = sc.titleLine2 || '';
    els.titleLine2Color.value = sc.titleLine2Color || '#00d4ff';
    els.titleLine2Align.value = sc.titleLine2Align || 'center';
    els.titleLine2Size.value = sc.titleLine2Size || 60;
    els.titleLine2SizeVal.textContent = sc.titleLine2Size || 60;
    els.titleLine3.value = sc.titleLine3 || '';
    els.titleLine3Color.value = sc.titleLine3Color || '#ff8844';
    els.titleLine3Align.value = sc.titleLine3Align || 'center';
    els.titleLine3Size.value = sc.titleLine3Size || 48;
    els.titleLine3SizeVal.textContent = sc.titleLine3Size || 48;
    els.sceneContent.value = sc.content;

    els.imagePosition.value = sc.imagePosition || 'fullscreen';
    els.imageScale.value = sc.imageScale || 100;
    els.imageScaleVal.textContent = sc.imageScale || 100;
    els.imageOffsetX.value = sc.imageOffsetX || 0;
    els.imageOffsetXVal.textContent = sc.imageOffsetX || 0;
    els.imageOffsetY.value = sc.imageOffsetY || 0;
    els.imageOffsetYVal.textContent = sc.imageOffsetY || 0;

    els.sceneBgColor1.value = sc.bgColor1;
    els.sceneBgColor2.value = sc.bgColor2;
    els.sceneBgGradient.checked = sc.bgGradient;
    els.showAccent.checked = !!sc.showAccent;
    els.showPageCounter.checked = !!sc.showPageCounter;
    els.highlightColor.value = sc.highlightColor || '#d4622b';
    els.contentItalic.checked = !!sc.contentItalic;
    els.textPosition.value = sc.textPosition || 'top';
    els.sceneDuration.value = sc.duration;
    els.durationValue.textContent = sc.duration;
    els.titleAnimation.value = sc.titleAnimation;
    els.contentAnimation.value = sc.contentAnimation;
    els.imageAnimation.value = sc.imageAnimation;
    els.sceneTransition.value = sc.sceneTransition;
    els.titleFont.value = sc.titleFont;
    els.contentFont.value = sc.contentFont;
    els.contentSize.value = sc.contentSize;
    els.contentSizeVal.textContent = sc.contentSize;
    els.contentColor.value = sc.contentColor;

    els.contentDelay.value = sc.contentDelay != null ? sc.contentDelay : 0.9;
    els.contentDelayVal.textContent = sc.contentDelay != null ? sc.contentDelay : 0.9;
    els.contentAnimDur.value = sc.contentAnimDur != null ? sc.contentAnimDur : 0.8;
    els.contentAnimDurVal.textContent = sc.contentAnimDur != null ? sc.contentAnimDur : 0.8;
    els.titleDelay.value = sc.titleDelay != null ? sc.titleDelay : 0.3;
    els.titleDelayVal.textContent = sc.titleDelay != null ? sc.titleDelay : 0.3;
    els.titleAnimDur.value = sc.titleAnimDur != null ? sc.titleAnimDur : 0.7;
    els.titleAnimDurVal.textContent = sc.titleAnimDur != null ? sc.titleAnimDur : 0.7;

    updateImageControls(sc);

    if (sc.imageSrc) {
      els.imagePreview.src = sc.imageSrc;
      els.imagePreview.hidden = false; els.imagePreview.style.display = 'block';
      els.btnRemoveImage.hidden = false; els.btnRemoveImage.style.display = 'flex';
      els.uploadPlaceholder.style.display = 'none';
    } else {
      els.imagePreview.hidden = true; els.imagePreview.style.display = 'none';
      els.btnRemoveImage.hidden = true; els.btnRemoveImage.style.display = 'none';
      els.uploadPlaceholder.style.display = '';
    }

    renderSceneList();
    refreshPreview();
  }

  function updateImageControls(sc) {
    const hasImg = !!sc.imageSrc;
    els.imagePositionGroup.style.display = hasImg ? '' : 'none';
    els.imageScaleGroup.style.display = hasImg ? '' : 'none';
    els.imageOffsetGroup.style.display = hasImg ? '' : 'none';
  }

  function getActive() { return scenes[activeSceneIndex] || null; }

  function addScene() {
    const sc = createDefaultScene();
    sc.titleLine1 = 'Cảnh ' + (scenes.length + 1);
    scenes.push(sc);
    engine.scenes = scenes;
    selectScene(scenes.length - 1);
    showToast('Đã thêm cảnh mới', 'success');
  }

  function deleteScene(i) {
    if (scenes.length <= 1) { showToast('Cần ít nhất 1 cảnh', 'error'); return; }
    scenes.splice(i, 1);
    engine.scenes = scenes;
    if (activeSceneIndex >= scenes.length) activeSceneIndex = scenes.length - 1;
    selectScene(activeSceneIndex);
    showToast('Đã xóa cảnh', 'info');
  }

  function updateScene(prop, value) {
    const sc = getActive();
    if (sc) { sc[prop] = value; refreshPreview(); }
  }

  function refreshPreview() {
    let offset = 0;
    for (let i = 0; i < activeSceneIndex; i++) offset += scenes[i].duration;
    const sc = getActive();
    engine.renderFrame(offset + Math.min((sc ? sc.duration : 5) * 0.4, 2.5));
  }

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const sc = getActive();
    if (!sc) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      sc.imageSrc = src;
      const img = new Image();
      img.onload = () => {
        sc.imageObj = img;
        els.imagePreview.src = src;
        els.imagePreview.hidden = false; els.imagePreview.style.display = 'block';
        els.btnRemoveImage.hidden = false; els.btnRemoveImage.style.display = 'flex';
        els.uploadPlaceholder.style.display = 'none';
        updateImageControls(sc);
        refreshPreview(); renderSceneList();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    const sc = getActive();
    if (!sc) return;
    sc.imageSrc = null; sc.imageObj = null;
    els.imagePreview.hidden = true; els.imagePreview.style.display = 'none';
    els.btnRemoveImage.hidden = true; els.btnRemoveImage.style.display = 'none';
    els.uploadPlaceholder.style.display = '';
    updateImageControls(sc);
    refreshPreview();
  }

  function formatTime(s) {
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  }

  function togglePlay() {
    if (engine.isPlaying) {
      engine.pause();
      els.playIcon.style.display = ''; els.pauseIcon.style.display = 'none';
    } else {
      if (engine.currentTime >= engine.getTotalDuration()) engine.currentTime = 0;
      engine.play();
      els.playIcon.style.display = 'none'; els.pauseIcon.style.display = '';
    }
  }

  function stopPlayback() {
    engine.stop();
    els.playIcon.style.display = ''; els.pauseIcon.style.display = 'none';
  }

  async function startExport() {
    if (!scenes.length) { showToast('Thêm ít nhất 1 cảnh', 'error'); return; }
    const [w, h] = els.exportResolution.value.split('x').map(Number);
    const fps = parseInt(els.exportFPS.value);
    engine.stop();

    els.exportModal.hidden = false;
    els.exportModalTitle.textContent = 'Đang xuất video...';
    els.exportProgressBar.style.width = '0%';
    els.exportPercent.textContent = '0%';
    els.exportStatus.textContent = 'Đang chuẩn bị...';
    els.btnDownload.hidden = true;
    els.btnCancelExport.hidden = false;
    els.btnCancelExport.textContent = 'Hủy';

    exporter.onProgress = (pct) => {
      els.exportProgressBar.style.width = pct + '%';
      els.exportPercent.textContent = pct + '%';
    };
    exporter.onStatus = (msg) => { els.exportStatus.textContent = msg; };
    exporter.onComplete = (blob) => {
      const url = URL.createObjectURL(blob);
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      els.btnDownload.href = url;
      els.btnDownload.download = `video_${Date.now()}.${ext}`;
      els.btnDownload.hidden = false;
      els.btnDownload.textContent = `Tải về (.${ext})`;
      els.exportModalTitle.textContent = 'Xuất video hoàn tất!';
      els.btnCancelExport.textContent = 'Đóng';
    };

    try {
      await exporter.exportMP4(w, h, fps);
    } catch (err) {
      if (err.message.includes('hủy')) {
        els.exportModal.hidden = true;
        showToast('Đã hủy', 'info'); return;
      }
      console.warn('MP4 failed, trying WebM:', err);
      showToast('Chuyển sang WebM...', 'info');
      try { await exporter.exportWebM(fps); }
      catch (e2) { els.exportModal.hidden = true; showToast('Lỗi: ' + e2.message, 'error'); }
    }
  }

  function setupEvents() {
    els.btnAddScene.onclick = addScene;

    // Title lines (debounced)
    let t1t, t2t, t3t, ct;
    els.titleLine1.oninput = () => { clearTimeout(t1t); t1t = setTimeout(() => { updateScene('titleLine1', els.titleLine1.value); renderSceneList(); }, 150); };
    els.titleLine2.oninput = () => { clearTimeout(t2t); t2t = setTimeout(() => { updateScene('titleLine2', els.titleLine2.value); renderSceneList(); }, 150); };
    els.titleLine3.oninput = () => { clearTimeout(t3t); t3t = setTimeout(() => { updateScene('titleLine3', els.titleLine3.value); renderSceneList(); }, 150); };
    els.sceneContent.oninput = () => { clearTimeout(ct); ct = setTimeout(() => updateScene('content', els.sceneContent.value), 150); };

    // Title colors & alignment
    els.titleLine1Color.oninput = () => updateScene('titleLine1Color', els.titleLine1Color.value);
    els.titleLine2Color.oninput = () => updateScene('titleLine2Color', els.titleLine2Color.value);
    els.titleLine3Color.oninput = () => updateScene('titleLine3Color', els.titleLine3Color.value);
    els.titleLine1Align.onchange = () => updateScene('titleLine1Align', els.titleLine1Align.value);
    els.titleLine2Align.onchange = () => updateScene('titleLine2Align', els.titleLine2Align.value);
    els.titleLine3Align.onchange = () => updateScene('titleLine3Align', els.titleLine3Align.value);

    // Background
    els.sceneBgColor1.oninput = () => updateScene('bgColor1', els.sceneBgColor1.value);
    els.sceneBgColor2.oninput = () => updateScene('bgColor2', els.sceneBgColor2.value);
    els.sceneBgGradient.onchange = () => updateScene('bgGradient', els.sceneBgGradient.checked);

    // Decoration
    els.showAccent.onchange = () => updateScene('showAccent', els.showAccent.checked);
    els.showPageCounter.onchange = () => updateScene('showPageCounter', els.showPageCounter.checked);
    els.highlightColor.oninput = () => updateScene('highlightColor', els.highlightColor.value);
    els.contentItalic.onchange = () => updateScene('contentItalic', els.contentItalic.checked);
    els.textPosition.onchange = () => updateScene('textPosition', els.textPosition.value);

    // Duration
    els.sceneDuration.oninput = () => {
      const v = parseFloat(els.sceneDuration.value);
      els.durationValue.textContent = v;
      updateScene('duration', v);
    };

    // Image upload
    els.imageUploadArea.onclick = (e) => { if (e.target !== els.btnRemoveImage) els.sceneImage.click(); };
    els.sceneImage.onchange = (e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); };
    els.btnRemoveImage.onclick = (e) => { e.stopPropagation(); removeImage(); };
    els.imageUploadArea.ondragover = (e) => { e.preventDefault(); els.imageUploadArea.classList.add('dragover'); };
    els.imageUploadArea.ondragleave = () => els.imageUploadArea.classList.remove('dragover');
    els.imageUploadArea.ondrop = (e) => {
      e.preventDefault(); els.imageUploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]);
    };

    // Image controls
    els.imagePosition.onchange = () => updateScene('imagePosition', els.imagePosition.value);
    els.imageScale.oninput = () => { els.imageScaleVal.textContent = els.imageScale.value; updateScene('imageScale', parseInt(els.imageScale.value)); };
    els.imageOffsetX.oninput = () => { els.imageOffsetXVal.textContent = els.imageOffsetX.value; updateScene('imageOffsetX', parseInt(els.imageOffsetX.value)); };
    els.imageOffsetY.oninput = () => { els.imageOffsetYVal.textContent = els.imageOffsetY.value; updateScene('imageOffsetY', parseInt(els.imageOffsetY.value)); };
    els.btnResetImageOffset.onclick = () => {
      els.imageOffsetX.value = 0; els.imageOffsetXVal.textContent = 0;
      els.imageOffsetY.value = 0; els.imageOffsetYVal.textContent = 0;
      els.imageScale.value = 100; els.imageScaleVal.textContent = 100;
      updateScene('imageOffsetX', 0); updateScene('imageOffsetY', 0); updateScene('imageScale', 100);
    };

    // Animations
    els.titleAnimation.onchange = () => updateScene('titleAnimation', els.titleAnimation.value);
    els.contentAnimation.onchange = () => updateScene('contentAnimation', els.contentAnimation.value);
    els.imageAnimation.onchange = () => updateScene('imageAnimation', els.imageAnimation.value);
    els.sceneTransition.onchange = () => updateScene('sceneTransition', els.sceneTransition.value);

    // Animation timing
    els.contentDelay.oninput = () => { els.contentDelayVal.textContent = els.contentDelay.value; updateScene('contentDelay', parseFloat(els.contentDelay.value)); };
    els.contentAnimDur.oninput = () => { els.contentAnimDurVal.textContent = els.contentAnimDur.value; updateScene('contentAnimDur', parseFloat(els.contentAnimDur.value)); };
    els.titleDelay.oninput = () => { els.titleDelayVal.textContent = els.titleDelay.value; updateScene('titleDelay', parseFloat(els.titleDelay.value)); };
    els.titleAnimDur.oninput = () => { els.titleAnimDurVal.textContent = els.titleAnimDur.value; updateScene('titleAnimDur', parseFloat(els.titleAnimDur.value)); };

    // Typography
    els.titleFont.onchange = () => updateScene('titleFont', els.titleFont.value);
    els.titleLine1Size.oninput = () => { els.titleLine1SizeVal.textContent = els.titleLine1Size.value; updateScene('titleLine1Size', parseInt(els.titleLine1Size.value)); };
    els.titleLine2Size.oninput = () => { els.titleLine2SizeVal.textContent = els.titleLine2Size.value; updateScene('titleLine2Size', parseInt(els.titleLine2Size.value)); };
    els.titleLine3Size.oninput = () => { els.titleLine3SizeVal.textContent = els.titleLine3Size.value; updateScene('titleLine3Size', parseInt(els.titleLine3Size.value)); };
    els.contentFont.onchange = () => updateScene('contentFont', els.contentFont.value);
    els.contentSize.oninput = () => { els.contentSizeVal.textContent = els.contentSize.value; updateScene('contentSize', parseInt(els.contentSize.value)); };
    els.contentColor.oninput = () => updateScene('contentColor', els.contentColor.value);

    // Playback
    els.btnPlay.onclick = togglePlay;
    els.btnStop.onclick = stopPlayback;
    els.btnPreview.onclick = () => {
      engine.currentTime = 0; engine.play();
      els.playIcon.style.display = 'none'; els.pauseIcon.style.display = '';
    };

    els.progressBar.onclick = (e) => {
      const r = els.progressBar.getBoundingClientRect();
      engine.seekTo(((e.clientX - r.left) / r.width) * engine.getTotalDuration());
    };

    engine.onTimeUpdate = (cur, tot) => {
      els.progressFill.style.width = (tot > 0 ? cur/tot*100 : 0) + '%';
      els.timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
    };
    engine.onPlaybackEnd = () => { els.playIcon.style.display = ''; els.pauseIcon.style.display = 'none'; };

    // Export
    els.btnExport.onclick = startExport;
    els.btnCancelExport.onclick = () => {
      if (els.btnDownload.hidden) exporter.cancel();
      els.exportModal.hidden = true;
    };

    els.exportResolution.onchange = () => {
      const [w, h] = els.exportResolution.value.split('x').map(Number);
      canvas.width = w; canvas.height = h;
      fitCanvas(); refreshPreview();
    };

    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'Escape') stopPlayback();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
