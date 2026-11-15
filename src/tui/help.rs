use ratatui::text::{Line, Span};

use super::app::App;
use super::ui::{self, Lines};

const GLOBAL_HELP: [&str; 9] = [
    "↑/↓ j/k   move",
    "enter     open",
    "esc       back",
    "/         filter this list, or search everything where there is no list",
    "ctrl+k    search problems, companies, topics and notes",
    "[ ]       previous / next tab, from any screen (leaves an open problem)",
    "1-5 tab   jump to a tab from the main screens (today, map, timed, playlists, stats)",
    "?         close this help",
    "q         quit",
];

impl App {
    pub(super) fn help_view(&self, width: usize, height: usize) -> Lines {
        let th = &self.sh.theme;
        let mut lines = self.top().help();
        if !lines.is_empty() {
            lines.push(Line::default());
        }
        lines.extend(
            GLOBAL_HELP
                .iter()
                .map(|l| Line::from(Span::styled(*l, th.muted))),
        );
        let title = format!("keys · {}", self.top().title());
        ui::modal(th, &title, lines, width, height)
    }
}
