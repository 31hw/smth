import { createUseStyles } from "react-jss";
import AssetDetailsStore from "../stores/AssetDetailsStore";
import React, { useEffect, useState } from "react";
import { CurrencyType } from "../../../models/enums";
import Currency from "../../Currency";
import ResaleSvgChart from "../../resaleSvgChart";

const useStyles = createUseStyles({
    containerHeader: {
        margin: "3px 0 6px",
        "& h3": {
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
        },
    },
    priceChartStatsContainer: {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        width: "100%",
        marginTop: 10,
    },
    priceChartStat: {
        display: "flex",
        flexDirection: "column",
        gap: 9,
        justifyContent: "center",
        alignItems: "center",
    },
    priceChartTextLabel: {
        color: "#b8b8b8",
        fontWeight: 500,
    },
});

function PriceChart({ isLabelHidden = false }) {
    const s = useStyles();
    const store = AssetDetailsStore.useContainer();
    const [prices, setPrices] = useState({
        originalPriceCurrency: 1,
        originalPrice: -1,
        averagePrice: -1,
    });

    useEffect(() => {
        if (!store.details || !store.resaleData) return;
        let currency = store.details?.priceTickets ? CurrencyType.Tickets : CurrencyType.Robux;
        let originalPrice = store.details?.priceTickets || store.details?.price || 0;
        let avgPrice = store.resaleData.recentAveragePrice;
        setPrices({
            originalPriceCurrency: currency,
            originalPrice: originalPrice,
            averagePrice: avgPrice,
        });
    }, [store.details, store.resaleData]);

    if (!store.resaleData) {
        return (
            <div>
                {!isLabelHidden ? (
                    <div className={`flex ${s.containerHeader}`}>
                        <h3 style={{ margin: 0 }}>Price Chart</h3>
                    </div>
                ) : null}
                <div className="section-content">
                    <span className="spinner" style={{ height: "100%", backgroundSize: "auto 36px" }} />
                </div>
            </div>
        );
    }

    return (
        <div>
            {!isLabelHidden ? (
                <div className={`flex ${s.containerHeader}`}>
                    <h3 style={{ margin: 0 }}>Price Chart</h3>
                </div>
            ) : null}
            <div className="section-content noShadow">
                <ResaleSvgChart
                    pricePoints={store.resaleData.priceDataPoints}
                    volumePoints={store.resaleData.volumeDataPoints}
                />
                <div className={s.priceChartStatsContainer}>
                    <div className={s.priceChartStat}>
                        <span className={s.priceChartTextLabel}>Quantity Sold</span>
                        <span style={{ fontWeight: 500 }}>{store.resaleData.sales ?? 0}</span>
                    </div>
                    <div className={s.priceChartStat}>
                        <span className={s.priceChartTextLabel}>Original Price</span>
                        <div className="flex">
                            <Currency
                                canBeFree
                                price={prices.originalPrice}
                                currencyType={prices.originalPriceCurrency}
                            />
                        </div>
                    </div>
                    <div className={s.priceChartStat}>
                        <span className={s.priceChartTextLabel}>Average Price</span>
                        <div className="flex">
                            <Currency
                                price={prices.averagePrice}
                                currencyType={CurrencyType.Robux}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PriceChart;
