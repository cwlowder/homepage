import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import checkAndCopyConfig, { CONF_DIR, substituteEnvironmentVars } from "utils/config/config";

// map easy to write YAML objects into easy to consume JS arrays
function parseSubWidgets(rawWidgets, parent) {
  return rawWidgets.map((raw, index) => {
    if (parent && parent.type === "animated") {
      index = parent.options.index + '-' + index;
    }

    const type = Object.keys(raw)[0];
    let options = raw[Object.keys(raw)[0]];

    return {
      type: type,
      options: {
        index,
        ...options,
      },
    };
  });
}

export async function widgetsFromConfig() {
  checkAndCopyConfig("widgets.yaml");

  const widgetsYaml = path.join(CONF_DIR, "widgets.yaml");
  const rawFileContents = await fs.readFile(widgetsYaml, "utf8");
  const fileContents = substituteEnvironmentVars(rawFileContents);
  const widgets = yaml.load(fileContents);

  if (!widgets) return [];

  // map easy to write YAML objects into easy to consume JS arrays
  const widgetsArray = widgets.map((group, index) => {
    const type = Object.keys(group)[0];
    let options = group[Object.keys(group)[0]]

    if (type === "animated" && options.widgets) {
      options.widgets = parseSubWidgets(options.widgets, {options: {index}, type})
    }

    return{
      type: Object.keys(group)[0],
      options: {
        index,
        ...options,
      },
    }
  });

  return widgetsArray;
}

export async function cleanWidgetGroups(widgets, parent) {
  return widgets.map((widget, index) => {
    const sanitizedOptions = widget.options;
    const optionKeys = Object.keys(sanitizedOptions);

    // delete private options from the sanitized options
    ["username", "password", "key", "apiKey"].forEach((pO) => {
      if (optionKeys.includes(pO)) {
        delete sanitizedOptions[pO];
      }
    });

    // delete url from the sanitized options if the widget is not a search or glances widget
    if (widget.type !== "search" && widget.type !== "glances" && optionKeys.includes("url")) {
      delete sanitizedOptions.url;
    }

    // Cleanup animated widgets
    if (widget.type === "animated" && widget.options.widgets) {
      const subWidgets = widget.options.widgets.map((raw, subIndex) => {
        return {
          type: raw.type,
          options: {
            index: index + '-' + subIndex,
            ...raw.options,
          }
        };
      });
      cleanWidgetGroups(subWidgets, index);
    }

    if (parent !== undefined) {
      index = parent + '-' + index;
    }

    return {
      type: widget.type,
      options: {
        index,
        ...sanitizedOptions,
      },
    };
  });
}

function compilePrivateWidgetOptions(widgets) {
  return widgets.flatMap((widget) => {
    const { index, url, username, password, key, apiKey } = widget.options;

    if (widget.type === "animated" && widget.options.widgets) {
      return compilePrivateWidgetOptions(widget.options.widgets);
    }

    return {
      type: widget.type,
      options: {
        index,
        url,
        username,
        password,
        key,
        apiKey,
      },
    };
  });
}

export async function getPrivateWidgetOptions(type, widgetIndex) {
  const widgets = await widgetsFromConfig();

  const privateOptions = compilePrivateWidgetOptions(widgets);

  return type !== undefined && widgetIndex !== undefined
    ? privateOptions.find((o) => o.type === type && (o.options.index === parseInt(widgetIndex, 10) || o.options.index === widgetIndex))?.options
    : privateOptions;
}
