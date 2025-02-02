import { NextPage } from "next";
import React from "react";

import { displayForecastsWrapperForCapture } from "../web/display/displayForecastsWrappers";
import Layout from "../web/display/layout";
import { Props } from "../web/search/anySearchPage";
import CommonDisplay from "../web/search/CommonDisplay";

export { getServerSideProps } from "../web/search/anySearchPage";

const CapturePage: NextPage<Props> = (props) => {
  return (
    <Layout page={"capture"}>
      <CommonDisplay
        {...props}
        hasSearchbar={true}
        hasCapture={true}
        hasAdvancedOptions={false}
        placeholder={"Get best title match..."}
        displaySeeMoreHint={false}
        displayForecastsWrapper={displayForecastsWrapperForCapture}
      />
    </Layout>
  );
};

export default CapturePage;
