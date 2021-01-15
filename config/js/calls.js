let calls = {
  missionPath: "Missions/",
  logout: {
    type: "POST",
    url: "api/users/logout",
  },
  getToolConfig: {
    type: "GET",
    url: "api/tools/get",
  },
  get: {
    type: "GET",
    url: "api/configure/get",
  },
  add: {
    type: "POST",
    url: "api/configure/add",
  },
  upsert: {
    type: "POST",
    url: "api/configure/upsert",
  },
  clone: {
    type: "POST",
    url: "api/configure/clone",
  },
  rename: {
    type: "POST",
    url: "api/configure/rename",
  },
  destroy: {
    type: "POST",
    url: "api/configure/destroy",
  },
  missions: {
    type: "POST",
    url: "api/configure/missions",
  },
  versions: {
    type: "POST",
    url: "api/configure/versions",
  },
  geodatasets_recreate: {
    type: "POST",
    url: "api/geodatasets/recreate",
  },
  geodatasets_entries: {
    type: "POST",
    url: "api/geodatasets/entries",
  },
  geodatasets_get: {
    type: "GET",
    url: "api/geodatasets/get",
  },
  datasets_recreate: {
    type: "POST",
    url: "api/datasets/recreate",
  },
  datasets_entries: {
    type: "POST",
    url: "api/datasets/entries",
  },
  datasets_get: {
    type: "GET",
    url: "api/datasets/get",
  },
  longtermtoken_generate: {
    type: "POST",
    url: "api/longtermtoken/generate",
  },
};
