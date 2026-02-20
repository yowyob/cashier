const fs = require('fs');
const path = require('path');

const replacements = {
    'compteComptable': 'accountingAccount',
    'secteurActivite': 'businessSector',
    'tailleEntreprise': 'companySize',
    'registreCommerce': 'tradeRegistryNumber',
    'numeroFiscal': 'taxNumber',
    'canalPrefere': 'preferredChannel',
    'typeClientOhada': 'ohadaType',
    'plafondCredit': 'creditLimit',
    'canalAquisition': 'acquisitionChannel',
    'estAssujettiTVA': 'vatSubject',
    'sourceProspect': 'source',
    'potentiel': 'potential',
    'dateConversion': 'conversionDate',
    'probabilite': 'probability',
    'notesProspect': 'notes',
    'typeCommercial': 'agentType',
    'dateDebutContrat': 'contractStartDate',
    'dateFinContrat': 'contractEndDate',
    'zonesCouvertes': 'coveredZones',
    'specialisations': 'specializations',
    'modePaiement': 'paymentMode',
    'delaiLivraison': 'deliveryLeadTime',
    'produitsPrincipaux': 'mainProductType',
};

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const dirs = [
    '/home/bala/RT-ComOps/app',
    '/home/bala/RT-ComOps/components',
    '/home/bala/RT-ComOps/lib',
    '/home/bala/RT-ComOps/types'
];

let files = [];
dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        files = files.concat(walk(dir));
    }
});

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [oldVal, newVal] of Object.entries(replacements)) {
        if (content.includes(oldVal)) {
            // Use regex for exact word match if needed, but split/join is safe here since these are unique property names
            const regex = new RegExp(`\\b${oldVal}\\b`, 'g');
            if (regex.test(content)) {
                content = content.replace(regex, newVal);
                changed = true;
            }
        }
    }
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    }
});
