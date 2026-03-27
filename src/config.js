// Auto-detects the server host so the app works on both:
// - PC: localhost:5000
// - Android on same WiFi: 10.146.218.82:5000
const API_BASE = `http://${window.location.hostname}:5000`;

export default API_BASE;
