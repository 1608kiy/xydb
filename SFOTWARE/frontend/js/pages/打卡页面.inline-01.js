
      (function () {
        var PAGE_VER = '20260322_sync4';
        try {
          var u = new URL(window.location.href);
          if (u.searchParams.get('v') !== PAGE_VER) {
            u.searchParams.set('v', PAGE_VER);
            window.location.replace(u.toString());
          }
        } catch (e) {}
      })();
    
