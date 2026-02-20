package yowyob.comops.api.infrastructure.adapter.out.persistence.entity.thirdparty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("fournisseurs")
public class SupplierDetailsEntity {
    @Id
    private UUID id; // Same as Tiers ID

    @Column("mode_paiement")
    private String paymentMode;
    
    @Column("produits_principaux")
    private String mainProductType;
    
    @Column("delai_livraison")
    private String deliveryLeadTime;
    
    private String certification;
}
