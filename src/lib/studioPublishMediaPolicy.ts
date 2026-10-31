export type StudioCreativeAsset={kind:string;mime:string};
/** Provider-specific media for the exact already-reviewed delivery. Never transcode after approval. */
export function eligibleStudioPublishMedia(channel:string,assets:StudioCreativeAsset[]):boolean{
  if(channel==='facebook')return assets.some(a=>a.kind==='image'&&
    ['image/png','image/jpeg'].includes(a.mime));
  if(channel==='instagram')return assets.some(a=>a.kind==='image'&&a.mime==='image/jpeg');
  if(channel==='youtube')return assets.some(a=>a.kind==='video'&&a.mime==='video/mp4');
  return false;
}
export function studioPublishedMediaType(channel:string,asset:StudioCreativeAsset){
  if(channel==='facebook')return asset.kind==='image'&&['image/png','image/jpeg'].includes(asset.mime);
  if(channel==='instagram')return asset.kind==='image'&&asset.mime==='image/jpeg';
  if(channel==='youtube')return asset.kind==='video'&&asset.mime==='video/mp4';
  return false;
}
