import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'rooms.json');

function loadRoomSnapshot() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            return {};
        }
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function saveRoomSnapshot(snapshot) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, {recursive: true});
        }
        fs.writeFileSync(DATA_PATH, JSON.stringify(snapshot, null, 2));
    } catch (error) {
        // Intentionally ignore persistence errors to avoid crashing the server.
    }
}

export {
    loadRoomSnapshot,
    saveRoomSnapshot,
};
