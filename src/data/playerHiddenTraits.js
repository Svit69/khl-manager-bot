import { HiddenPlayerTrait, normalizeHiddenTraits } from "../models/HiddenPlayerTraits.js";

const TRAITS_BY_PHOTO_SLUG = Object.freeze({
  abrosimov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  anas: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  atanasov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  barach: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  beck: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  blacker: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  blandisi: [HiddenPlayerTrait.UNDISCIPLINED],
  blazhiyevsky: [HiddenPlayerTrait.UNDISCIPLINED],
  boucher: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  brosseau: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST, HiddenPlayerTrait.UNDISCIPLINED],
  cecconi: [HiddenPlayerTrait.UNDISCIPLINED],
  comtois: [HiddenPlayerTrait.UNDISCIPLINED],
  "da-costa": [HiddenPlayerTrait.PLAYOFF_CHOKER],
  denisenko: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  dietz: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  dynyak: [HiddenPlayerTrait.UNDISCIPLINED],
  geraskin: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  gordeyev: [HiddenPlayerTrait.UNDISCIPLINED],
  gusev: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  gutik: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  "ivan-morozov": [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  jaskin: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST, HiddenPlayerTrait.UNDISCIPLINED],
  kaldis: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  kantserov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST, HiddenPlayerTrait.UNDISCIPLINED],
  keane: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  korostelyov: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  kravtsov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  kruchinin: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  lajoie: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  leivo: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  maltsev: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  "mikhail-vorobyov": [HiddenPlayerTrait.PLAYOFF_CHOKER],
  miller: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  moroz: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  murphy: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  okulov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  panin: [HiddenPlayerTrait.UNDISCIPLINED],
  pedan: [HiddenPlayerTrait.UNDISCIPLINED],
  pinchuk: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  press: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  prince: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  prokhorkin: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  pylenkov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  radulov: [HiddenPlayerTrait.UNDISCIPLINED],
  rempal: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  sharipzyanov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  shalunov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  sikura: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  silantyev: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  smith: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  stewart: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  suchkov: [HiddenPlayerTrait.PLAYOFF_CHOKER],
  surin: [HiddenPlayerTrait.UNDISCIPLINED],
  telegin: [HiddenPlayerTrait.UNDISCIPLINED],
  tkachyov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  todd: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  tryamkin: [HiddenPlayerTrait.UNDISCIPLINED],
  vinogradov: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  vorobyev: [HiddenPlayerTrait.UNDISCIPLINED],
  weal: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  yakovlev: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  "yevgeni-kuznetsov": [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
  zharovsky: [HiddenPlayerTrait.POWER_PLAY_SPECIALIST],
});

const getPhotoSlug = (profile) =>
  String(profile?.identity?.photoUrl || "")
    .split("/")
    .pop()
    ?.replace(/\.png$/i, "") || "";

export const applyConfiguredHiddenTraits = (profile) => {
  const configuredTraits = TRAITS_BY_PHOTO_SLUG[getPhotoSlug(profile)] || [];
  if (!configuredTraits.length && !profile?.hiddenTraits?.length) return profile;
  return {
    ...profile,
    hiddenTraits: normalizeHiddenTraits([...(profile.hiddenTraits || []), ...configuredTraits]),
  };
};

export const configuredHiddenTraitSlugs = Object.freeze(Object.keys(TRAITS_BY_PHOTO_SLUG));
