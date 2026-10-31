import {describe,it,expect} from 'vitest';
import {reconcileSkillEditorSnapshot} from '../src/lib/personalSkillEditorState.js';
describe('personal skill editor network race guard',()=>{
  it('a network response cannot replace edits typed while the save request is pending',()=>{
    const submitted={voiceLanguage:'Before request'};
    const typed={voiceLanguage:'New typing during save'};
    const result=reconcileSkillEditorSnapshot(submitted,typed,3,4);
    expect(result.form).toEqual(typed);
    expect(result.baseline).toEqual(submitted);
    expect(result.newerEditsPreserved).toBe(true);
    expect(JSON.stringify(result.form)!==JSON.stringify(result.baseline)).toBe(true);
  });
  it('a clean response updates form and baseline when no later edits exist',()=>{
    const result=reconcileSkillEditorSnapshot({voiceLanguage:'Published version'},
      {voiceLanguage:'Old saved draft'},4,4);
    expect(result.form).toEqual(result.baseline);
    expect(result.newerEditsPreserved).toBe(false);
  });
  it('the initial load cannot erase typing entered before its first response',()=>{
    const result=reconcileSkillEditorSnapshot({voiceLanguage:'Remote default'},
      {voiceLanguage:'Typed quickly'},0,1);
    expect(result.form.voiceLanguage).toBe('Typed quickly');
    expect(result.baseline.voiceLanguage).toBe('Remote default');
  });
});
