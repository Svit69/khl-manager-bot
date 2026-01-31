export const generateId=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
