import { isPlaceholderPhoto } from "../utils/PlayerPhoto.js";

export class PlayerPhotoRestoration {
  static restoreCurrentDatabasePhoto(player, databasePhotoUrl) {
    if (/^(junior-|system-fa-)/.test(player.id) || isPlaceholderPhoto(databasePhotoUrl)) return;
    player.identity.photoUrl = databasePhotoUrl;
  }
}
