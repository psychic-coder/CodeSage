declare module '*.css';
declare module '*.module.css';
declare module '*.scss';
declare module '*.module.scss';
declare module '*.less';
declare module '*.module.less';

// Allow importing images as modules in TS
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// Explicit ReactFlow CSS declarations (side-effect imports)
declare module 'reactflow/dist/style.css';
declare module 'reactflow/dist/base.css';

export {};
