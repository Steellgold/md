const editPathPrefix = "/edit/";

const decodePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getRouteDocumentId = (pathname: string) => {
  if (!pathname.startsWith(editPathPrefix)) {
    return null;
  }

  const rawDocumentId = pathname.slice(editPathPrefix.length).split("/")[0] ?? "";
  const normalizedDocumentId = decodePathSegment(rawDocumentId).trim();

  return normalizedDocumentId === "" ? null : normalizedDocumentId;
};

export const buildEditRoute = (documentId: string) =>
  `${editPathPrefix}${encodeURIComponent(documentId)}`;
