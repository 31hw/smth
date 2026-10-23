import React, { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { getResaleData } from "../../../services/economy";
import CatalogDetailsPage from "../stores/catalogDetailsPage";
import ResaleSvgChart from "../../resaleSvgChart";

const useSaleHistoryStyles = createUseStyles({
  rap: {
    color: '#060',
    fontWeight: '600',
  },
  rapText: {
    fontSize: '14px',
    marginBottom: 0,
  },
  row: {
    marginTop: '32px',
  },
});

const SaleHistory = () => {
  const store = CatalogDetailsPage.useContainer();
  const [rap, setRap] = useState(null);
  const [rapChart, setRapChart] = useState(null);
  const [volumeChart, setVolumeChart] = useState(null);
  const s = useSaleHistoryStyles();

  useEffect(() => {
    if (!store.details) return;
    getResaleData({ assetId: store.details.id }).then((resaleData) => {
      setRap(resaleData.recentAveragePrice ?? 0);
      setRapChart(resaleData.priceDataPoints || []);
      setVolumeChart(resaleData.volumeDataPoints || []);
      if (store.saleCount === 0 && resaleData.sales) {
        store.setSaleCount(resaleData.sales);
      }
    });
  }, [store.details]);

  if (!rapChart) return null;

  return (
    <div className={`row ${s.row}`}>
      <div className="col-12 ps-4 pe-4">
        <p className={s.rapText}>
          Recent Average Price: <span className={s.rap}>R$ {(rap ?? 0).toLocaleString()}</span>
        </p>
      </div>
      <div className="col-12 mt-2 ps-4 pe-3">
        <ResaleSvgChart pricePoints={rapChart} volumePoints={volumeChart} compact />
      </div>
    </div>
  );
};

export default SaleHistory;
