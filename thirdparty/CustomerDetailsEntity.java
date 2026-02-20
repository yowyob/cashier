package yowyob.comops.api.infrastructure.adapter.out.persistence.entity.thirdparty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("clients")
public class CustomerDetailsEntity {
    @Id
    private UUID id; // Same as Tiers ID

    private String segment; // CustomerSegment
    
    @Column("plafond_credit")
    private BigDecimal creditLimit;
    
    @Column("canal_aquisition")
    private String acquisitionChannel;
    
    @Column("numero_tva")
    private String customerVatNumber;
    
    @Column("est_assujetti_tva")
    private Boolean vatSubject;
    
    // Sales types
    @Column("vente_detail")
    private Boolean retailSale;
    
    @Column("vente_demi_gros")
    private Boolean semiWholesale;
    
    @Column("vente_gros")
    private Boolean wholesale;
    
    @Column("vente_super_gros")
    private Boolean superWholesale;
    
    @Column("type_client_ohada")
    private String ohadaType;
}
