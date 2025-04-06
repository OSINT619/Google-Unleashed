document.addEventListener("DOMContentLoaded", () => {
    const filters_names = [
        "Search for",
        "intitle",
        "allintitle",
        "intext",
        "allintext",
        "inurl",
        "allinurl",
        "site",
        "numrange",
        "inext",
        "inanchor",
        "allinanchor",
        "related",
        "cache",
    ];
    const filters = filters_names.map(name => [name, null, null]);

    document.getElementById("filter-select").addEventListener("change", onFilterSelect);
    document.getElementById("add-filter").addEventListener("click", onAddFilter);
    document.getElementById("go-button").addEventListener("click", onGoButton);
    document.getElementById("rate-us").addEventListener("click", onRateUsButton);

    document.body.onkeydown = e => {
        if (e.key === "Enter")
            document.getElementById("go-button").click();
    };

    (async function initializeFilters() {
        const saved_filters = (await chrome.storage.local.get(["filters"]))?.filters;

        if (!Array.isArray(saved_filters) || saved_filters.length !== filters.length || saved_filters.some(filter => filter !== null && typeof filter !== "string")) {
            await chrome.storage.local.remove(["filters"]);
        } else {
            for (let i = 0; i < saved_filters.length; i++) {
                filters[i][1] = saved_filters[i];
            }
        }

        for (let i = 0; i < filters.length; i++) {
            if (filters[i][1] === null) {
                createFilterElement(i, saveToStorage);
            }
        }

        document.getElementById("go-button").disabled = filters.every(filter => filter[2] === null);
    })();

    function keywordInput(value) {
        return `<input id="filter-input" class="input is-rounded" type="text" value="${filters[value][1] ?? ""}" placeholder="Keyword" />`;
    }

    function stringInput(value) {
        return `<input id="filter-input" class="input is-rounded" type="text" value="${filters[value][1] ?? ""}" placeholder="String" />`;
    }

    function siteInput(value) {
        return `<input id="filter-input" class="input is-rounded" type="url" value="${filters[value][1] ?? ""}" placeholder="Site" />`;
    }

    function numericalRangeInput(value) {
        return `<div style="display: inline-flex; flex-direction: row"><input id="filter-input-1" class="input is-rounded" type="number" value="${filters[value][1]?.split(/\-/)[0] ?? ""}" placeholder="Start" /><div style="width: 40px"></div><input id="filter-input-2" class="input is-rounded" type="number" value="${filters[value][1]?.split(/\-/)[1] ?? ""}" placeholder="Stop" /></div>`;
    }

    function fileTypeInput(value) {
        return `<datalist id="file-type-options"><option value="pdf"></option><option value="doc"></option><option value="docx"></option><option value="xls"></option><option value="xlsx"></option><option value="ppt"></option><option value="pptx"></option><option value="txt"></option><option value="csv"></option><option value="xml"></option><option value="json"></option><option value="mp3"></option><option value="mp4"></option><option value="jpg"></option><option value="jpeg"></option><option value="png"></option><option value="gif"></option><option value="zip"></option><option value="rar"></option></datalist><input id="filter-input" class="input is-rounded" type="text" value="${filters[value][1] ?? ""}" list="file-type-options" placeholder="File Type" />`;
    }

    function onFilterSelect() {
        const value = parseInt(document.getElementById("filter-select").value, 10);
        const view = document.getElementById("filter-view");

        let currentElement = null, fieldIds = [];
        if ([1, 3, 5, 7, 12].includes(value)) {
            currentElement = stringInput(value - 1);
            fieldIds = ["filter-input"];
        }
        else if ([2, 4, 6, 11].includes(value)) {
            currentElement = keywordInput(value - 1);
            fieldIds = ["filter-input"];
        }
        else if ([8, 13, 14].includes(value)) {
            currentElement = numericalRangeInput(value - 1);
            fieldIds = ["filter-input-1", "filter-input-2"];
        }
        else if (value === 9) {
            currentElement = fileTypeInput(value - 1);
            fieldIds = ["filter-input"];
        }

        if (value === 0) {
            view.innerHTML = "";
            document.getElementById("add-filter").disabled = true;
            return;
        }

        document.getElementById("add-filter").disabled = false;

        if (currentElement === null)
            return;

        view.innerHTML = currentElement;

        for (const id of fieldIds)
            document.getElementById(id).onkeydown = e => {
                e.stopPropagation();
                if (e.key === "Enter") {
                    onAddFilter();
                }
            };
    }

    async function onAddFilter() {
        const value = parseInt(document.getElementById("filter-select").value, 10) - 1;

        if (value < 0)
            return;

        if (value === 8) {
            const start = document.getElementById("filter-input-1").value;
            const stop = document.getElementById("filter-input-2").value;
            filters[value][1] = `${start}-${stop}`;
        } else {
            const input = document.getElementById("filter-input").value;
            filters[value][1] = input;
        }

        if (filters[value][2] !== null) {
            document.getElementById("filters").removeChild(filters[value][2]);
            filters[value][2] = null;
        }

        createFilterElement(value, saveToStorage);
        await saveToStorage();
    }

    function onGoButton() {
        let query = "";
        for (let i = 0; i < filters.length; i++) {
            if (filters[i][1] === null) continue;

            if (i === 0)
                query += `"${filters[i][1]}" `;
            else if (i === 7 || i === 8) {
                query += `site:${filters[i][1]} `;
            } else {
                query += `${filters_names[i]}:"${filters[i][1]}" `;
            }
        }

        if (query === "")
            return;

        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
    }

    function onRateUsButton() {
        window.open("https://chrome.google.com/webstore/detail/dork-it/lnihadedihilhjcbnimcobnppdlldocm", "_blank");
    }

    function createFilterElement(index, onRemoved) {
        if (!filters[index][1]) return; // Skip if the filter value is null or empty

        document.getElementById("filters").insertAdjacentHTML("beforeend", `<div class="filter fade-in"><span>${filters[index][0]}:${index === 8 ? `${filters[index][1]}` : `"${filters[index][1]}"`}</span></div>`);
        const div = document.getElementById("filters").lastChild;
        div.insertAdjacentHTML("beforeend", '<img style="margin-left: 10px; cursor: pointer" alt="Cancel" src="img/cancel.svg" width="16px" height="16px" />');
        const img = div.lastChild;

        filters[index][2] = div;

        img.addEventListener("click", (e) => {
            e.stopPropagation();
            div.classList.remove("fade-in");
            div.classList.add("fade-out");

            setTimeout(() => {
                document.getElementById("filters").removeChild(div);
                filters[index][1] = filters[index][2] = null;

                document.getElementById("filter-count").innerText = filters.filter(filter => !!filter[2]).length;
                document.getElementById("go-button").disabled = filters.every(filter => filter[2] === null);

                if (onRemoved)
                    onRemoved();
            }, 250);
        });

        document.getElementById("filter-count").innerText = filters.filter(filter => !!filter[2]).length;
        document.getElementById("go-button").disabled = false;
    }

    async function saveToStorage() {
        try {
            await chrome.storage.local.set({
                filters: filters.map(filter => filter[1]),
            });
        } catch (error) {
            console.error(error);
        }
    }
});