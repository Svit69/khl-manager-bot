import { generateId } from "../utils/uid.js";
const USER_KEY="khl-user";
const SAVE_KEY="khl-save";
const DRAFT_KEY="khl-draft";
export class UserStore{
  loadUser(){
    const raw=localStorage.getItem(USER_KEY);
    if(raw)return JSON.parse(raw);
    const user={id:generateId("guest"),type:"guest"};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    return user;
  }
  loadSave(){return JSON.parse(localStorage.getItem(SAVE_KEY)||"null")}
  saveState(state){localStorage.setItem(SAVE_KEY,JSON.stringify(state))}
  loadDraft(){return JSON.parse(localStorage.getItem(DRAFT_KEY)||"null")}
  saveDraft(draft){localStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}
  clearDraft(){localStorage.removeItem(DRAFT_KEY)}
  clearSave(){localStorage.removeItem(SAVE_KEY);localStorage.removeItem(DRAFT_KEY)}
}
