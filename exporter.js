/**
 * VideoExporter - Exports canvas animation to MP4 using WebCodecs + mp4-muxer
 */
class VideoExporter {
  constructor(engine) {
    this.engine = engine;
    this.cancelled = false;
    this.onProgress = null;
    this.onStatus = null;
    this.onComplete = null;
    this.onError = null;
  }

  cancel() { this.cancelled = true; }

  async exportMP4(width, height, fps) {
    this.cancelled = false;

    // Check WebCodecs support
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('Trình duyệt không hỗ trợ WebCodecs. Vui lòng dùng Chrome/Edge phiên bản mới nhất.');
    }

    if (this.onStatus) this.onStatus('Đang khởi tạo encoder...');

    const totalDuration = this.engine.getTotalDuration();
    const totalFrames = Math.ceil(totalDuration * fps);
    if (totalFrames === 0) throw new Error('Không có cảnh nào để xuất.');

    // Resize canvas temporarily
    const origW = this.engine.canvas.width;
    const origH = this.engine.canvas.height;
    this.engine.canvas.width = width;
    this.engine.canvas.height = height;

    try {
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height,
        },
        fastStart: 'in-memory',
      });

      let encoderDone = false;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => { muxer.addVideoChunk(chunk, meta); },
        error: (e) => { if (this.onError) this.onError(e); },
      });

      // Find supported codec
      const codecs = ['avc1.640028', 'avc1.42001f', 'avc1.4d0028'];
      let selectedCodec = null;
      for (const codec of codecs) {
        try {
          const support = await VideoEncoder.isConfigSupported({
            codec, width, height, bitrate: 5_000_000, framerate: fps,
          });
          if (support.supported) { selectedCodec = codec; break; }
        } catch (e) { /* try next */ }
      }

      if (!selectedCodec) {
        throw new Error('Không tìm thấy codec H.264 được hỗ trợ. Vui lòng dùng Chrome/Edge mới nhất.');
      }

      encoder.configure({
        codec: selectedCodec,
        width, height,
        bitrate: 5_000_000,
        framerate: fps,
      });

      if (this.onStatus) this.onStatus('Đang render video...');

      // Render frame by frame
      for (let i = 0; i < totalFrames; i++) {
        if (this.cancelled) {
          encoder.close();
          this.engine.canvas.width = origW;
          this.engine.canvas.height = origH;
          throw new Error('Đã hủy xuất video.');
        }

        const time = i / fps;
        this.engine.renderFrame(time);

        const frame = new VideoFrame(this.engine.canvas, {
          timestamp: Math.round(i * (1_000_000 / fps)),
          duration: Math.round(1_000_000 / fps),
        });

        const keyFrame = i % (fps * 2) === 0; // keyframe every 2 seconds
        encoder.encode(frame, { keyFrame });
        frame.close();

        // Yield to main thread periodically
        if (i % 5 === 0) {
          const pct = Math.round((i / totalFrames) * 100);
          if (this.onProgress) this.onProgress(pct);
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (this.onStatus) this.onStatus('Đang hoàn tất file MP4...');
      if (this.onProgress) this.onProgress(95);

      await encoder.flush();
      encoder.close();
      muxer.finalize();

      if (this.onProgress) this.onProgress(100);
      if (this.onStatus) this.onStatus('Hoàn tất!');

      const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
      if (this.onComplete) this.onComplete(blob);

      return blob;
    } finally {
      // Restore canvas size
      this.engine.canvas.width = origW;
      this.engine.canvas.height = origH;
      this.engine.renderFrame(this.engine.currentTime);
    }
  }

  /**
   * Fallback export using MediaRecorder (WebM)
   */
  async exportWebM(fps) {
    this.cancelled = false;
    if (this.onStatus) this.onStatus('Đang ghi video (WebM)...');

    const canvas = this.engine.canvas;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5_000_000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (this.onProgress) this.onProgress(100);
        if (this.onStatus) this.onStatus('Hoàn tất (WebM)!');
        if (this.onComplete) this.onComplete(blob);
        resolve(blob);
      };
      recorder.onerror = reject;
      recorder.start();

      // Play the animation
      this.engine.currentTime = 0;
      this.engine.play();

      this.engine.onPlaybackEnd = () => {
        setTimeout(() => {
          recorder.stop();
          stream.getTracks().forEach(t => t.stop());
        }, 200);
      };
    });
  }
}
