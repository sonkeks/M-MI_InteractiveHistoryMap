import type {EventLocation, HistoricEvent} from "@/components/types.ts";
import type {LatLngTuple} from "leaflet";
import {toaster} from "@/components/ui/toaster.tsx";

function buildDetailsQuery(ids: HistoricEvent['id'][]): string {
  const values = ids.join(' ');
  return `
    SELECT ?event (CONCAT("wd:", REPLACE(STR(?event), "^.*Q", "Q")) AS ?eventId) ?eventLabel ?eventDescription
           ?startDate ?endDate
           ?location (CONCAT("wd:", REPLACE(STR(?location), "^.*Q", "Q")) AS ?locationId)
           ?locationLabel ?coordinate ?image
           ?eventArticle ?eventImage
    WHERE {
      VALUES ?event { ${values} }

      OPTIONAL { ?event wdt:P585 ?startDate. }       # point in time
      OPTIONAL { ?event wdt:P582 ?endDate. }         # end date
      OPTIONAL { ?event wdt:P276 ?location. }        # location
      OPTIONAL { ?event wdt:P18 ?eventImage. }       # image of the event
      OPTIONAL { ?location wdt:P625 ?coordinate. }   # coordinate location
      OPTIONAL { ?location wdt:P18 ?image. }         # image of the location

      OPTIONAL {
        ?eventArticle schema:about ?event ;
                      schema:isPartOf <https://en.wikipedia.org/> .
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
  `;
}

async function fetchWikidataSPARQL(query: string): Promise<EventLocation[]> {
  const response = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      "Accept": "application/sparql-results+json"
    },
    body: query
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results.bindings;
}

export async function getEventsData(ids: HistoricEvent['id'][]) {
  const query = buildDetailsQuery(ids);
  const result = fetchWikidataSPARQL(query);
  queueMicrotask(() => {
    toaster.promise(result, {
      success: { title: "Locations Retrieved" },
      loading: { title: "Retrieving Locations..." }
    })
  });
  return result;
}

export function pointStringToLatLngTuple(point: string): LatLngTuple {
  const cleaned = point.replace("Point(", "").replace(")", "");
  
  const [x, y] = cleaned.split(" ").map(Number);
  
  return [y, x];
}

