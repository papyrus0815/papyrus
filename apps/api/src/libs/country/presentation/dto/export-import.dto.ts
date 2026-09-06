/**
 * 국가 교역 DTO — 정본은 교역 도메인(`libs/trade`)에 있다.
 *
 * `/countries/:id/export-imports`와 `/trade/records`가 **같은 모양**을 내려주도록
 * 여기서는 다시 정의하지 않고 그대로 내보낸다. 두 곳에서 각자 정의하면 화면마다
 * 필드가 있다 없다 하는 비대칭이 생긴다.
 */
export type {
  EraDto,
  ExportImportItemResponse,
  ExportImportResponse,
  TradeChannelDto,
  TradeDataConfidenceDto,
  TradeDirectionDto,
  TradeFlowGrainDto,
  TradePartnerKindDto,
  TradePeriodAggregationDto,
  TradePriceBasisDto,
  TradeRestrictionKindDto,
  TradeTransportModeDto,
  TradeValueScaleDto,
  UpsertExportImportDto,
  UpsertExportImportItemDto,
} from '../../../trade/presentation/dto/trade.dto'
