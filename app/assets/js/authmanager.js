/**
 * AuthManager
 * 
 * This module aims to abstract login procedures. Results from Mojang's REST api
 * are retrieved through our Mojang module. These results are processed and stored,
 * if applicable, in the config using the ConfigManager. All login procedures should
 * be made through this module.
 * 
 * @module authmanager
 */
// Requirements
const errors = require('adm-zip/util/errors');
const ConfigManager                     = require('./configmanager')
const { LoggerUtil }                    = require('helios-core')

const { AZauth } = require('minecraft-java-core')
const auth = new AZauth('https://nexuscraftrp.fun');

const log                               = LoggerUtil.getLogger('AuthManager')

// Functions

/**
 * Add a Mojang account. This will authenticate the given credentials with Mojang's
 * authserver. The resultant data will be stored as an auth account in the
 * configuration database.
 * 
 * @param {string} email The account username (email if migrated).
 * @param {string} password The account password.
 * @param {number} a2f The account a2f
 * @returns {Promise.<Object>} Promise which resolves the resolved authenticated account object.
 */
exports.addMojangAccount = async function(email, password, a2f) {
    let result

    if (a2f === null)
        result = await auth.login(email, password);
    else
        result = await auth.login(email, password, a2f);

    if (result.A2F) 
        return {needA2F: true}

    if (result.error) 
        throw result
    
    const ret = ConfigManager.addAzAuthAccount(result)
    ConfigManager.save()

    return ret
}

/**
 * Remove a AzAuth account. This will invalidate the access token associated
 * with the account and then remove it from the database.
 * 
 * @param {string} uuid The UUID of the account to be removed.
 * @param {string} accessToken The UUID of the account to be removed.
 * @returns {Promise.<boolean>} Promise which resolves to void when the action is complete.
 */
exports.removeAzAuthAccount = async function(uuid, accessToken) {
    try {
        const authAcc = ConfigManager.getAuthAccount(uuid)
        await auth.signout(authAcc);
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return true;
    } catch (err){
        log.error('Error while removing account', err)
        return Promise.reject(err)
    }
}

/**
 * Validate the selected auth account.
 * 
 * @returns {Promise.<boolean>} Promise which resolves to true if the access token is valid,
 * otherwise false.
 */
exports.validateSelected = async function(){
    const current = ConfigManager.getSelectedAccount()
    let result = await auth.verify(current)

    if (result.error)
        return false;

    return true
}