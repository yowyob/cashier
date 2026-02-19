package yowyob.comops.api.infrastructure.adapter.out.persistence.mapper.config;

import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;
import yowyob.comops.api.domain.model.config.AgencySettings;
import yowyob.comops.api.domain.model.config.AppBusinessSettings;
import yowyob.comops.api.infrastructure.adapter.out.persistence.entity.config.AgencySettingsEntity;
import yowyob.comops.api.infrastructure.adapter.out.persistence.entity.config.AppBusinessSettingsEntity;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-02-06T11:07:08+0100",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 23 (Oracle Corporation)"
)
@Component
public class GeneralOptionsMapperImpl implements GeneralOptionsMapper {

    @Override
    public AppBusinessSettings toDomainGlobal(AppBusinessSettingsEntity entity) {
        if ( entity == null ) {
            return null;
        }

        AppBusinessSettings.AppBusinessSettingsBuilder appBusinessSettings = AppBusinessSettings.builder();

        appBusinessSettings.organizationId( entity.getOrganizationId() );
        appBusinessSettings.organizationPrefix( entity.getOrganizationPrefix() );
        if ( entity.getNegotiateSellingPrice() != null ) {
            appBusinessSettings.negotiateSellingPrice( entity.getNegotiateSellingPrice() );
        }
        if ( entity.getSellingPriceIncludeVat() != null ) {
            appBusinessSettings.sellingPriceIncludeVat( entity.getSellingPriceIncludeVat() );
        }
        if ( entity.getAuthorizeExceptionalDiscount() != null ) {
            appBusinessSettings.authorizeExceptionalDiscount( entity.getAuthorizeExceptionalDiscount() );
        }
        appBusinessSettings.grantableDiscountRate( entity.getGrantableDiscountRate() );
        appBusinessSettings.lengthOfVatInvoiceNumber( entity.getLengthOfVatInvoiceNumber() );
        appBusinessSettings.prefixOfVatInvoiceNumber( entity.getPrefixOfVatInvoiceNumber() );
        if ( entity.getLowStockAlert() != null ) {
            appBusinessSettings.lowStockAlert( entity.getLowStockAlert() );
        }
        if ( entity.getPreventiveMaintenanceAlert() != null ) {
            appBusinessSettings.preventiveMaintenanceAlert( entity.getPreventiveMaintenanceAlert() );
        }

        return appBusinessSettings.build();
    }

    @Override
    public AppBusinessSettingsEntity toEntityGlobal(AppBusinessSettings domain) {
        if ( domain == null ) {
            return null;
        }

        AppBusinessSettingsEntity appBusinessSettingsEntity = new AppBusinessSettingsEntity();

        appBusinessSettingsEntity.setId( domain.getId() );
        appBusinessSettingsEntity.setOrganizationId( domain.getOrganizationId() );
        appBusinessSettingsEntity.setOrganizationPrefix( domain.getOrganizationPrefix() );
        appBusinessSettingsEntity.setNegotiateSellingPrice( domain.isNegotiateSellingPrice() );
        appBusinessSettingsEntity.setSellingPriceIncludeVat( domain.isSellingPriceIncludeVat() );
        appBusinessSettingsEntity.setAuthorizeExceptionalDiscount( domain.isAuthorizeExceptionalDiscount() );
        appBusinessSettingsEntity.setGrantableDiscountRate( domain.getGrantableDiscountRate() );
        appBusinessSettingsEntity.setLengthOfVatInvoiceNumber( domain.getLengthOfVatInvoiceNumber() );
        appBusinessSettingsEntity.setPrefixOfVatInvoiceNumber( domain.getPrefixOfVatInvoiceNumber() );
        appBusinessSettingsEntity.setLowStockAlert( domain.isLowStockAlert() );
        appBusinessSettingsEntity.setPreventiveMaintenanceAlert( domain.isPreventiveMaintenanceAlert() );

        return appBusinessSettingsEntity;
    }

    @Override
    public AgencySettings toDomainLocal(AgencySettingsEntity entity) {
        if ( entity == null ) {
            return null;
        }

        AgencySettings.AgencySettingsBuilder agencySettings = AgencySettings.builder();

        agencySettings.agencyId( entity.getAgencyId() );
        agencySettings.agencyPrefix( entity.getAgencyPrefix() );
        if ( entity.getIsPrintLogo() != null ) {
            agencySettings.isPrintLogo( entity.getIsPrintLogo() );
        }
        agencySettings.paperFormat( entity.getPaperFormat() );
        agencySettings.ticketFooterMessage( entity.getTicketFooterMessage() );
        if ( entity.getAllowNegativeStock() != null ) {
            agencySettings.allowNegativeStock( entity.getAllowNegativeStock() );
        }
        agencySettings.defaultTimezone( entity.getDefaultTimezone() );

        return agencySettings.build();
    }

    @Override
    public AgencySettingsEntity toEntityLocal(AgencySettings domain) {
        if ( domain == null ) {
            return null;
        }

        AgencySettingsEntity agencySettingsEntity = new AgencySettingsEntity();

        agencySettingsEntity.setId( domain.getId() );
        agencySettingsEntity.setAgencyId( domain.getAgencyId() );
        agencySettingsEntity.setAgencyPrefix( domain.getAgencyPrefix() );
        agencySettingsEntity.setPaperFormat( domain.getPaperFormat() );
        agencySettingsEntity.setTicketFooterMessage( domain.getTicketFooterMessage() );
        agencySettingsEntity.setAllowNegativeStock( domain.isAllowNegativeStock() );
        agencySettingsEntity.setDefaultTimezone( domain.getDefaultTimezone() );

        return agencySettingsEntity;
    }
}
