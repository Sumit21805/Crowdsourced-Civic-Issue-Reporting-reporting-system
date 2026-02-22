// Auto-detects the server host so the app works on both:
// - PC: localhost:5000
// - Android on same WiFi: 192.168.1.8:5000
const API_BASE = `http://${window.location.hostname}:5000`;

export default API_BASE;
