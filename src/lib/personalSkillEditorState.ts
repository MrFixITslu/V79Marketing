// Pure reconciliation rule used by the Settings editor after asynchronous
// saves/refetches. A stale network response must not erase newer typing.
export function reconcileSkillEditorSnapshot<T>(
  remote:T,local:T|null,requestStartedEditRevision:number,currentEditRevision:number,
):{form:T;baseline:T;newerEditsPreserved:boolean}{
  if(currentEditRevision!==requestStartedEditRevision && local!==null)
    return {form:local,baseline:remote,newerEditsPreserved:true};
  return {form:remote,baseline:remote,newerEditsPreserved:false};
}
