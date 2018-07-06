$(document).ready(function() {

  $('.js-pm-toggle-checkbox').change(function() {
    var is_allow_private_message;
    
    if (this.checked) {
      is_allow_private_message = true;
    } else {
      is_allow_private_message = false;
    }

    return fetch('/user/is_allow_private_message', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({is_allow_private_message: is_allow_private_message})
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Bad status code from server.');
      }

      return response.json();
    })
    .then(function(responseData) {
      if (!(responseData.data && responseData.data.success)) {
        throw new Error('Bad response from server.');
      }
    }); 
  });
});