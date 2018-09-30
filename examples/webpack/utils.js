import path from 'path';

export const dir = (subPath) => path.resolve(__dirname, subPath);

export const root = (subPath) => path.resolve(__dirname, `../${subPath}`);
