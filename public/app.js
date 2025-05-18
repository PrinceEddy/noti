let currentSubscription = null;

if ('serviceWorker' in navigator && 'PushManager' in window) {
  init();
} else {
  document.getElementById('status').textContent = 'Notifications not supported';
}

async function init() {
  try {
    const registration = await navigator.serviceWorker.register('sw.js');
    console.log('Service Worker registered');
    
    currentSubscription = await registration.pushManager.getSubscription();
    updateUI();
    
    document.getElementById('subscribe').addEventListener('click', subscribe);
    document.getElementById('unsubscribe').addEventListener('click', unsubscribe);
  } catch (error) {
    console.error('Error:', error);
  }
}

function updateUI() {
  const status = document.getElementById('status');
  if (currentSubscription) {
    status.textContent = 'You are subscribed!';
  } else {
    status.textContent = 'Not subscribed yet.';
  }
}

async function subscribe() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const options = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BGv-mAR1R2rOXr0gTIvy0fuW7azaeorga07SKGo0vpYkdlfXT5vA3i_zo_wEHlwlgXEdjONG6GBska094EaYPu0')
    };
    
    const topics = [];
    if (document.getElementById('news').checked) topics.push('news');
    if (document.getElementById('updates').checked) topics.push('updates');
    
    if (topics.length === 0) {
      alert('Select at least one topic!');
      return;
    }
    
    currentSubscription = await registration.pushManager.subscribe(options);
    
    await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: currentSubscription, topics })
    });
    
    updateUI();
    alert('Subscribed!');
  } catch (error) {
    console.error('Error subscribing:', error);
    alert('Failed to subscribe. Check console.');
  }
}

async function unsubscribe() {
  if (!currentSubscription) {
    alert('Not subscribed yet!');
    return;
  }
  
  try {
    await currentSubscription.unsubscribe();
    await fetch('/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: currentSubscription.endpoint })
    });
    
    currentSubscription = null;
    updateUI();
    alert('Unsubscribed!');
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
}

// Helper function (leave this as-is)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}