function showNotification(event) {
    return new Promise(resolve => {
        console.log(event.data);
        const { body, title, tag } = JSON.parse(event.data.text());
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
    event.waitUntil(clients.openWindow("/"));
});