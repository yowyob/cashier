export const LOCATION_DATA: Record<string, Record<string, string[]>> = {
    "Cameroon": {
        "Douala": ["Akwa", "Bonapriso", "Bonamoussadi", "Bali"],
        "Yaoundé": ["Biyem-Assi", "Melen", "Bastos", "Etoudi"],
        "Bafoussam": ["Tamdja", "Banengo"],
        "Garoua": ["Plateau", "Poumpoumre"],
        "Maroua": ["Domayo", "Pitoare"],
        "Bamenda": ["Up Station", "Mankon"],
        "Ngaoundéré": ["Dang", "Beka"],
        "Bertoua": ["Nkolbikon"],
        "Ebolowa": ["Nko'ovos"],
        "Buea": ["Molyko", "Great Soppo"],
        "Kribi": ["Mpalla", "Ngoye"],
        "Limbe": ["Bota", "Mile 4"],
        "Dschang": ["Tchantchouang"]
    },
    "Senegal": {
        "Dakar": ["Plateau", "Yoff", "Parcelles", "Mermoz"],
        "Thiès": ["Mbour 1", "Tivaouane"],
        "Kaolack": ["Medina Mbaba"],
        "Saint-Louis": ["Sor", "Bango"],
        "Ziguinchor": ["Boutoute"],
        "Touba": ["Gouye Mbinde"],
        "Mbour": ["Grand Mbour"]
    },
    "Côte d'Ivoire": {
        "Abidjan": ["Cocody", "Yopougon", "Marcory", "Treichville"],
        "Bouaké": ["Air France", "Dar-es-Salam"],
        "Daloa": ["Lobia"],
        "Yamoussoukro": ["Dioulakro"],
        "San-Pédro": ["Balmer"],
        "Korhogo": ["Soba"],
        "Man": ["Tonkpi"]
    }
};

export const COUNTRIES = Object.keys(LOCATION_DATA);

export function townsFor(country: string) {
    return Object.keys(LOCATION_DATA[country] || {});
}

export function neighborhoodsFor(country: string, town: string) {
    return (LOCATION_DATA[country] || {})[town] || [];
}
