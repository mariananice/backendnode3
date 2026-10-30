import xlsx from 'xlsx'

export function parseExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    return rows.map(row => {
        const normalizedRow = {};

        for (const key in row) {
            const normalizedKey = key
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_');

            normalizedRow[normalizedKey] = row[key];
        }

        return normalizedRow;
    });
}