// Controlled research phrases; these are extracted labels, not author keywords.
export const TOPICS = {
  'Diffusion models': ['diffusion', 'diffusion models'],
  '3D vision': ['3d', 'three dimensional', 'point cloud', 'point clouds'],
  'Image segmentation': ['segmentation', 'segment anything'],
  'Object detection': ['object detection', 'detector', 'object detectors'],
  'Vision-language': ['vision language', 'visual language', 'vision and language', 'clip'],
  'Transformers': ['transformer', 'transformers', 'attention mechanism'],
  'Self-supervised learning': ['self supervised', 'contrastive learning', 'masked autoencoder'],
  'Image generation': ['image generation', 'text to image', 'generative', 'image synthesis'],
  'Neural rendering': ['neural rendering', 'nerf', 'neural radiance', 'gaussian splatting'],
  'Video understanding': ['video', 'action recognition', 'temporal modeling'],
  'Depth estimation': ['depth estimation', 'monocular depth', 'stereo matching'],
  'Domain adaptation': ['domain adaptation', 'domain generalization', 'distribution shift'],
  'Pose estimation': ['pose estimation', 'human pose', 'keypoint'],
  'Image restoration': ['image restoration', 'denoising', 'super resolution', 'deblurring'],
  'Autonomous driving': ['autonomous driving', 'driving', 'lidar'],
  'Tracking': ['tracking', 'multi object tracking'],
  'Few-shot learning': ['few shot', 'zero shot', 'open vocabulary'],
  'Multimodal learning': ['multimodal', 'multi modal'],
  'Medical imaging': ['medical', 'clinical', 'radiology'],
  'Visual recognition': ['image classification', 'visual recognition', 'recognition'],
};

export function normalizeText(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function extractKeywords(title, abstract = '') {
  const text = ` ${normalizeText(`${title} ${abstract}`)} `;
  return Object.entries(TOPICS)
    .filter(([, aliases]) => aliases.some(alias => text.includes(` ${alias} `)))
    .map(([topic]) => topic);
}

export function cleanKeywords(values) {
  if (!Array.isArray(values) || values.length > 30) throw new Error('关键词必须为最多30项的数组');
  return [...new Set(values.map(x => String(x).trim()).filter(Boolean))].map(x => {
    if (x.length > 80) throw new Error('单个关键词不能超过80字符');
    return x;
  });
}
