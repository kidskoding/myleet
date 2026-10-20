from solution import entity_parser


def test_entity_parser_ampersand_and_unknown_entity():
    text = "&amp; is an HTML entity but &ambassador; is not."
    assert entity_parser(text) == "& is an HTML entity but &ambassador; is not."


def test_entity_parser_quotes():
    assert entity_parser("and I quote: &quot;...&quot;") == 'and I quote: "..."'


def test_entity_parser_no_double_decoding():
    assert entity_parser("&amp;gt;") == "&gt;"


def test_entity_parser_every_entity():
    assert entity_parser("&quot;&apos;&amp;&gt;&lt;&frasl;") == "\"'&></"


def test_entity_parser_stray_ampersands():
    assert entity_parser("&&gt;&") == "&>&"


def test_entity_parser_plain_text():
    assert entity_parser("x < y") == "x < y"
