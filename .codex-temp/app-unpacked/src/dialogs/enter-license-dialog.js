/*
 * Copyright (c) 2013-2014 Minkyu Lee. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Minkyu Lee. The intellectual and technical concepts
 * contained herein are proprietary to Minkyu Lee and may be covered
 * by Republic of Korea and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Minkyu Lee (niklaus.lee@gmail.com).
 *
 */

const {shell} = require('electron')
const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')
const Strings = require('../strings')

const enterLicenseDialogTemplate = fs.readFileSync(path.join(__dirname, '../static/html-contents/enter-license-dialog.html'), 'utf8')

/**
 * Show License Manager Dialog
 * @private
 * @return {Dialog}
 */
function showDialog () {
  var context = {
    Strings: Strings,
    metadata: global.app.metadata
  }
  var dialog = app.dialogs.showModalDialogUsingTemplate(Mustache.render(enterLicenseDialogTemplate, context))

  var $dlg = dialog.getElement()
  var $buyNow = $dlg.find('.buy-now')
  var $licenseKey = $dlg.find('.license-key')

  $buyNow.click(function () {
    shell.openExternal(app.config.purchase_url)
  })

  dialog.then(function ({buttonId}) {
    if (buttonId === 'ok') {
      app.licenseManager.register($licenseKey.val().trim().toUpperCase())
        .then(function () {
          app.dialogs.showInfoDialog('恭喜!您的许可证密钥已成功注册。')
        },
        function (err) {
          if (err === 'invalid') {
            app.dialogs.showAlertDialog('无效的许可证密钥')
          } else if (err === 'unmatched') {
            app.dialogs.showAlertDialog('许可证为旧版本(需要升级)')
          } else {
            app.dialogs.showAlertDialog('许可证服务器暂时不可用。请稍后再试。')
          }
        })
    }
  })

  return dialog
}

exports.showDialog = showDialog
