export const readFileSync = () => '';
export const readFile = (_, __, callback) => callback?.(null);

export default {
  readFileSync,
  readFile,
};
