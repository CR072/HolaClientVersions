/**
 *--------------------------------------------------------------------------
 *   _    _       _        _____ _ _            _   
 * | |  | |     | |      / ____| (_)          | |  
 * | |__| | ___ | | __ _| |    | |_  ___ _ __ | |_ 
 * |  __  |/ _ \| |/ _` | |    | | |/ _ \ '_ \| __|
 * | |  | | (_) | | (_| | |____| | |  __/ | | | |_ 
 * |_|  |_|\___/|_|\__,_|\_____|_|_|\___|_| |_|\__|
 *--------------------------------------------------------------------------
 *
 * @author CR072 <crazymath072@holaclient.tech>
 * @license Apache-2.0
 * 
 * https://holaclient.tech
 * 
 * © 2022-2024 HolaClient
 *
 *--------------------------------------------------------------------------
 * antivm.js - Security feature to suspend servers running PteroVM
 *--------------------------------------------------------------------------
*/

/**
 *--------------------------------------------------------------------------
 * Loading modules
 *--------------------------------------------------------------------------
*/
const modules = require("../../../../utils/modules");
const page = modules.page;
const core = modules.core
const fetch = modules.fetch;
const wh = modules.wh;
module.exports.load = async function (app, db) {
    const pterodactyl = await db.get('pterodactyl', 'settings')
    const settings = await db.get('core', 'settings')
  app.get("/api/admin/purger/inactive", core.auth, async (req, res) => {
    const response = await fetch(`${pterodactyl.domain}/api/application/servers`, {
        headers: {
          Authorization: `Bearer ${pterodactyl.app}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get server list: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const servers = data.data;

      const inactiveServers = servers.filter(
        (server) => !server.attributes.name.includes(settings.features.purge.keyword)
      );

      res.json({total: servers.length, inactive: inactiveServers.length})
  })

  app.get("/api/admin/purger/inactive/update", core.auth, async (req, res) => {
    const sett = await db.get('core', 'settings')
    sett.features.purge.keyword = req.query.keyword
    await db.set('core', 'settings', sett)
      res.json({success: true})
  })

  app.get("/api/admin/purge/inactive", core.auth, async (req, res) => {
    try {
      const response = await fetch(`${pterodactyl.domain}/api/application/servers`, {
        headers: {
          Authorization: `Bearer ${pterodactyl.app}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get server list: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const servers = data.data;

      const inactiveServers = servers.filter(
        (server) => !server.attributes.name.includes(settings.features.purge.keyword)
      );

      for (const server of inactiveServers) {
        try {
          const serverId = server.attributes.id;
          const serverName = server.attributes.name;
          const deleteResponse = await fetch(`${pterodactyl.domain}/api/application/servers/${serverId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${pterodactyl.app}`,
              "Content-Type": "application/json",
            },
          });

          if (deleteResponse.ok) {
            console.log(`Server ${serverName} deleted successfully.`);
          } else {
            console.error(`Failed to delete server ${serverName}: ${deleteResponse.status} ${deleteResponse.statusText}`);
          }
        } catch (error) {
          console.error(`Failed to delete server ${server.attributes.name}: ${error}`);
        }
      }

      console.log("All inactive servers purged successfully");
      res.sendStatus(200);
    } catch (error) {
      console.error(`Failed to get server list: ${error.message}`);
      res.sendStatus(500);
    }
  });
};
