export const dirname = () => '';
export const normalize = (value) => value;
export const join = (...segments) => segments.join('/');
export const resolve = (...segments) => segments.join('/');

export default {
  dirname,
  normalize,
  join,
  resolve,
};
