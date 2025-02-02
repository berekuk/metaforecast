import axios from "axios";

import { DashboardItem } from "../../backend/dashboards";
import { Forecast } from "../../backend/platforms";

export async function getDashboardForecastsByDashboardId({
  dashboardId,
}): Promise<{
  dashboardForecasts: Forecast[];
  dashboardItem: DashboardItem;
}> {
  console.log("getDashboardForecastsByDashboardId: ");
  let dashboardContents: Forecast[] = [];
  let dashboardItem: DashboardItem | any = null;
  try {
    let { data } = await axios({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/dashboard-by-id`,
      method: "post",
      data: {
        id: dashboardId,
      },
    });
    console.log(data);
    dashboardContents = data.dashboardContents;
    dashboardItem = data.dashboardItem as DashboardItem;
  } catch (error) {
    console.log(error);
  } finally {
    return {
      dashboardForecasts: dashboardContents,
      dashboardItem,
    };
  }
}

export async function createDashboard(payload) {
  let data = { dashboardId: null };
  try {
    let { title, description, ids, creator, extra } = payload;
    console.log(payload);
    let response = await axios({
      url: "/api/create-dashboard-from-ids",
      method: "post",
      data: {
        title: title || "",
        description: description || "",
        ids: ids,
        creator: creator || "",
        extra: [],
      },
    });
    data = response.data;
    console.log(data);
  } catch (error) {
    console.log(error);
  } finally {
    return data;
  }
}
