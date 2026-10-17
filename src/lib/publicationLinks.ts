// Construct links only for a recognized provider receipt, never a supplied URL.
export function publicationUrl(channel:string, providerPostId:string):string|undefined {
  if(channel==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(providerPostId))
    return 'https://www.youtube.com/watch?v='+providerPostId;
  return undefined;
}
