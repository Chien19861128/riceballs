function showNotification(event) {
  return new Promise(resolve => {
    console.log(event.data);
    const { body, title, tag, url } = JSON.parse(event.data.text());
    self.registration
      .getNotifications({ tag })
      //.then(existingNotifications => { })
      .then(() => {
        const icon = `/images/favicon.ico`;
        return self.registration
          .showNotification(title, { body, tag, icon })
    })
    .then(resolve)
  })
}
self.addEventListener("push", event => {
  event.waitUntil(
    showNotification(event)
  );
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  
  const url = event.notification.data.url;

  if(url) {
    event.waitUntil(clients.openWindow(url));
  } else {
    event.waitUntil(clients.openWindow("/"));
  }
});