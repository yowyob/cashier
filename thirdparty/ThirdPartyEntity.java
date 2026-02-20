package yowyob.comops.api.infrastructure.adapter.out.persistence.entity.thirdparty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("tiers")
public class ThirdPartyEntity {
    @Id
    private UUID id;

    @Column("tenant_id")
    private UUID tenantId;
    
    @Column("agency_id")
    private UUID agencyId;

    private String code;
    private String name;
    
    @Column("short_name")
    private String shortName;
    private String description;
    
    @Column("compte_comptable")
    private String accountingAccount;

    @Column("compte_bancaire")
    private String bankAccountNumber;

    // Legal
    @Column("numero_fiscal")
    private String taxNumber;
    
    @Column("registre_commerce")
    private String tradeRegistryNumber;

    // Enums as Strings (legacy schema uses varchar)
    @Column("type_entreprise")
    private String type; // ThirdPartyType
    
    @Column("secteur_activite")
    private String businessSector; 
    
    @Column("taille_entreprise")
    private String companySize;

    // Contact
    private String email;
    
    @Column("phone_number")
    private String phoneNumber;
    private String website;
    
    @Column("canal_prefere")
    private String preferredChannel;

    // Address
    private String address;
    private String complement;
    
    @Column("postal_code")
    private String postalCode;
    private String city;
    @Column("pays")
    private String country;

    private Boolean active;
    
    @Column("created_at")
    private Instant createdAt;
    
    @Column("updated_at")
    private Instant updatedAt;
}
