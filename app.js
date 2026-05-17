/**
 * App - Main application controller with rich text support
 */
(function() {
  'use strict';

  let scenes = [];
  let activeSceneIndex = 0;
  let engine, exporter;

  function createDefaultScene() {
    return {
      id: Date.now() + Math.random(),
      title: '', content: '',
      imageSrc: null, imageObj: null,
      bgColor1: '#0f0c29', bgColor2: '#302b63', bgGradient: true, bgImageObj: null,
      duration: 5,
      titleAnimation: 'slideUp', contentAnimation: 'fadeIn',
      imageAnimation: 'fadeIn', sceneTransition: 'fade',
      titleFont: 'Be Vietnam Pro', titleSize: 60, titleColor: '#ffffff',
      contentFont: 'Inter', contentSize: 30, contentColor: '#c8c8e0',
      showAccent: true, textPosition: 'top',
    };
  }

  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#previewCanvas');

  const els = {
    sceneList: $('#sceneList'),
    sceneTitle: $('#sceneTitle'), sceneContent: $('#sceneContent'),

    sceneImage: $('#sceneImage'), imageUploadArea: $('#imageUploadArea'),
    uploadPlaceholder: $('#uploadPlaceholder'),
    imagePreview: $('#imagePreview'), btnRemoveImage: $('#btnRemoveImage'),
    sceneBgColor1: $('#sceneBgColor1'), sceneBgColor2: $('#sceneBgColor2'),
    sceneBgGradient: $('#sceneBgGradient'),
    showAccent: $('#showAccent'), textPosition: $('#textPosition'),
    sceneDuration: $('#sceneDuration'), durationValue: $('#durationValue'),
    titleAnimation: $('#titleAnimation'), contentAnimation: $('#contentAnimation'),
    imageAnimation: $('#imageAnimation'), sceneTransition: $('#sceneTransition'),
    titleFont: $('#titleFont'), titleSize: $('#titleSize'), titleSizeVal: $('#titleSizeVal'),
    titleColor: $('#titleColor'),
    contentFont: $('#contentFont'), contentSize: $('#contentSize'), contentSizeVal: $('#contentSizeVal'),
    contentColor: $('#contentColor'),
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

    // Demo scene with rich text
    const s1 = createDefaultScene();
    s1.title = 'Chào mừng Video Creator';
    s1.content = 'Công cụ tạo video từ nội dung văn bản và hình ảnh.\nThêm cảnh, chỉnh sửa, và xuất MP4.';
    s1.showAccent = true;
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

  /* --- Scene List --- */
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
      tc.fillStyle = sc.titleColor||'#fff'; tc.font = '7px Inter';
      tc.fillText((sc.title||'').replace(/\*/g,'').substring(0,15), 4, 28);

      const info = document.createElement('div');
      info.className = 'scene-item-info';
      const displayTitle = (sc.title || 'Cảnh ' + (i+1)).replace(/\*/g, '');
      info.innerHTML = `<div class="scene-item-title">${displayTitle}</div><div class="scene-item-duration">${sc.duration}s</div>`;

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
    els.sceneTitle.value = sc.title;
    els.sceneContent.value = sc.content;

    els.sceneBgColor1.value = sc.bgColor1;
    els.sceneBgColor2.value = sc.bgColor2;
    els.sceneBgGradient.checked = sc.bgGradient;
    els.showAccent.checked = !!sc.showAccent;
    els.textPosition.value = sc.textPosition || 'top';
    els.sceneDuration.value = sc.duration;
    els.durationValue.textContent = sc.duration;
    els.titleAnimation.value = sc.titleAnimation;
    els.contentAnimation.value = sc.contentAnimation;
    els.imageAnimation.value = sc.imageAnimation;
    els.sceneTransition.value = sc.sceneTransition;
    els.titleFont.value = sc.titleFont;
    els.titleSize.value = sc.titleSize;
    els.titleSizeVal.textContent = sc.titleSize;
    els.titleColor.value = sc.titleColor;
    els.contentFont.value = sc.contentFont;
    els.contentSize.value = sc.contentSize;
    els.contentSizeVal.textContent = sc.contentSize;
    els.contentColor.value = sc.contentColor;

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

  function getActive() { return scenes[activeSceneIndex] || null; }

  function addScene() {
    const sc = createDefaultScene();
    sc.title = 'Cảnh ' + (scenes.length + 1);
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

    // Text fields (debounced)
    let tt, ct, bt;
    els.sceneTitle.oninput = () => { clearTimeout(tt); tt = setTimeout(() => { updateScene('title', els.sceneTitle.value); renderSceneList(); }, 150); };
    els.sceneContent.oninput = () => { clearTimeout(ct); ct = setTimeout(() => updateScene('content', els.sceneContent.value), 150); };


    // Background
    els.sceneBgColor1.oninput = () => updateScene('bgColor1', els.sceneBgColor1.value);
    els.sceneBgColor2.oninput = () => updateScene('bgColor2', els.sceneBgColor2.value);
    els.sceneBgGradient.onchange = () => updateScene('bgGradient', els.sceneBgGradient.checked);

    // Decoration
    els.showAccent.onchange = () => updateScene('showAccent', els.showAccent.checked);
    els.textPosition.onchange = () => updateScene('textPosition', els.textPosition.value);

    // Duration
    els.sceneDuration.oninput = () => {
      const v = parseFloat(els.sceneDuration.value);
      els.durationValue.textContent = v;
      updateScene('duration', v);
    };

    // Image
    els.imageUploadArea.onclick = (e) => { if (e.target !== els.btnRemoveImage) els.sceneImage.click(); };
    els.sceneImage.onchange = (e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); };
    els.btnRemoveImage.onclick = (e) => { e.stopPropagation(); removeImage(); };
    els.imageUploadArea.ondragover = (e) => { e.preventDefault(); els.imageUploadArea.classList.add('dragover'); };
    els.imageUploadArea.ondragleave = () => els.imageUploadArea.classList.remove('dragover');
    els.imageUploadArea.ondrop = (e) => {
      e.preventDefault(); els.imageUploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]);
    };

    // Animations
    els.titleAnimation.onchange = () => updateScene('titleAnimation', els.titleAnimation.value);
    els.contentAnimation.onchange = () => updateScene('contentAnimation', els.contentAnimation.value);
    els.imageAnimation.onchange = () => updateScene('imageAnimation', els.imageAnimation.value);
    els.sceneTransition.onchange = () => updateScene('sceneTransition', els.sceneTransition.value);

    // Typography
    els.titleFont.onchange = () => updateScene('titleFont', els.titleFont.value);
    els.titleSize.oninput = () => { els.titleSizeVal.textContent = els.titleSize.value; updateScene('titleSize', parseInt(els.titleSize.value)); };
    els.titleColor.oninput = () => updateScene('titleColor', els.titleColor.value);
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
