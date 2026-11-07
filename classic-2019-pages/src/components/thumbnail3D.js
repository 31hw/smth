import { getRbxCdnUrl } from '../services/thumbnails';
import request from '../lib/request';

let vendor3DPromise = null;
export async function ensureVendor3DLoaded() {
  if (typeof window === 'undefined') return false;
  if (typeof window.THREE !== 'undefined' && window.THREE.OBJLoader) return true;
  if (!vendor3DPromise) {
    vendor3DPromise = (async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
          await import(chrome.runtime.getURL('bundles/vendor-3d.js'));
        }
      } catch (err) {
        console.warn('[Thumbnail3D] Could not lazy-load vendor-3d.js:', err);
      }
      return typeof window.THREE !== 'undefined';
    })();
  }
  return vendor3DPromise;
}

export class Thumbnail3DHandler {
  thumbJson = null;
  canvasParent = null;
  isLoadingThumbnail = false;
  set3DReady = null;
  defaultSize = 352;

  scene = null;
  renderer = null;
  camera = null;
  orbitControls = null;
  directionalLight = null;
  isStopping = false;

  Init(size = this.defaultSize) {
    this.defaultSize = size;
    if (typeof THREE === 'undefined') return false;
    try {
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.camera = new THREE.PerspectiveCamera(70);

      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setSize(size, size);
      this.canvasRef = this.renderer.domElement;

      this.scene.add(new THREE.AmbientLight(0x808080, 1));
      return true;
    } catch (_) {
      this.scene = null;
      this.renderer = null;
      return false;
    }
  }

  Run = () => {
    if (this.isStopping) {
      if (this.set3DReady) this.set3DReady(false);
      if (this.canvasParent && this.renderer && this.canvasParent.contains(this.renderer.domElement)) {
        this.canvasParent.removeChild(this.renderer.domElement);
      }
      this.isStopping = false;
      return;
    }

    this.orbitControls?.update();
    this.renderer?.render(this.scene, this.camera);
    requestAnimationFrame(this.Run);
  };

  async Stop() {
    this.isStopping = true;
    if (this.canvasParent && this.renderer && this.canvasParent.contains(this.renderer.domElement)) {
      this.canvasParent.removeChild(this.renderer.domElement);
    }
    if (this.set3DReady) this.set3DReady(false);
    this.isLoadingThumbnail = false;
  }

  async LoadThumbnail(thumbJson, canvasParent, set3DReady) {
    if (!thumbJson || !canvasParent) return;
    if (!(await ensureVendor3DLoaded())) return;
    await this.Stop();
    if (!this.scene) this.Init(this.defaultSize);
    if (!this.renderer || !this.scene) return;
    set3DReady(false);
    this.isLoadingThumbnail = true;
    this.set3DReady = set3DReady;

    const markedForRemoval = [];
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
        if (object.material?.map) object.material.map.dispose();
      }
      markedForRemoval.push(object);
    });
    for (const mesh of markedForRemoval) {
      if (mesh.parent) mesh.parent.remove(mesh);
    }
    this.renderer.render(this.scene, this.camera);
    if (this.canvasParent && this.canvasParent.contains(this.renderer.domElement)) {
      this.canvasParent.removeChild(this.renderer.domElement);
    }
    if (this.directionalLight) this.scene.remove(this.directionalLight);
    if (this.orbitControls) this.orbitControls.dispose();

    this.thumbJson = thumbJson;
    this.canvasParent = canvasParent;
    this.canvasParent.appendChild(this.renderer.domElement);

    this.camera.fov = thumbJson.camera?.fov || 70;
    this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement, thumbJson);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(
      thumbJson.aabb.max.x,
      thumbJson.aabb.max.y + 5,
      thumbJson.aabb.max.z + 5
    );
    this.directionalLight.castShadow = false;
    this.scene.add(this.directionalLight);

    try {
      const mtlUrl = getRbxCdnUrl(thumbJson.mtl);
      const objUrl = getRbxCdnUrl(thumbJson.obj);

      const [mtlRes, objRes] = await Promise.all([
        request('GET', mtlUrl),
        request('GET', objUrl),
      ]);
      const mtlText = typeof mtlRes.data === 'string' ? mtlRes.data : String(mtlRes.data || '');
      const objText = typeof objRes.data === 'string' ? objRes.data : String(objRes.data || '');

      const mtlLoader = new THREE.MTLLoader();
      if (typeof mtlLoader.setCrossOrigin === 'function') {
        mtlLoader.setCrossOrigin('anonymous');
      }
      const materials = mtlLoader.parse(mtlText, '');
      materials.baseUrl = '';

      // Resolve Roblox 32-char texture hashes to their exact t{0..7}.rbxcdn.com shard URLs
      const texArr = (thumbJson.textures || []).map(getRbxCdnUrl);
      for (const materialName in materials.materialsInfo) {
        const info = materials.materialsInfo[materialName];
        for (const key in info) {
          if (key.startsWith('map_')) {
            const val = String(info[key] || '').trim();
            if (val.startsWith('http://') || val.startsWith('https://')) {
              info[key] = val;
            } else if (/^[0-9a-fA-F]{24,64}$/.test(val.split('/').pop())) {
              info[key] = getRbxCdnUrl(val.split('/').pop());
            } else {
              const texId = materialName.match(/Player\d+/)?.[0];
              info[key] =
                (texId && texArr.find((t) => t.includes(`${texId}Tex`))) ||
                texArr[0] ||
                '';
            }
          }
        }
      }
      materials.preload();

      const objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      const object = objLoader.parse(objText);
      object.scale.set(1, 1, 1);
      this.scene.add(object);

      set3DReady(true);
      this.isLoadingThumbnail = false;
      this.isStopping = false;
      this.Run();
    } catch (err) {
      console.warn('[Thumbnail3D] Failed to load 3D avatar:', err);
      this.isLoadingThumbnail = false;
    }
  }

  Dispose() {
    if (this.canvasParent && this.renderer && this.canvasParent.contains(this.renderer.domElement)) {
      this.canvasParent.removeChild(this.renderer.domElement);
    }
    if (this.directionalLight && this.scene) this.scene.remove(this.directionalLight);
    if (this.orbitControls) this.orbitControls.dispose();
    if (this.camera && typeof this.camera.clear === 'function') this.camera.clear();
    if (this.renderer) this.renderer.dispose();
    if (this.scene) {
      const markedForRemoval = [];
      this.scene.traverse((object) => {
        if (!object.isMesh) return;
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
          if (object.material?.map) object.material.map.dispose();
        }
        markedForRemoval.push(object);
      });
      for (const mesh of markedForRemoval) {
        if (mesh.parent) mesh.parent.remove(mesh);
      }
      if (typeof this.scene.dispose === 'function') this.scene.dispose();
    }
    if (this.set3DReady) this.set3DReady(false);
    this.isLoadingThumbnail = false;
  }
}
