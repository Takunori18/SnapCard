export const isValidUUID = (value?: string | null): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
};
