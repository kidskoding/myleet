from solution import search_suggestions


def test_search_suggestions_normal():
    products = ["mobile", "mouse", "moneypot", "monitor", "mousepad"]
    search_word = "mouse"
    expected = [
        ["mobile", "moneypot", "monitor"],
        ["mobile", "moneypot", "monitor"],
        ["mouse", "mousepad"],
        ["mouse", "mousepad"],
        ["mouse", "mousepad"],
    ]
    assert search_suggestions(products, search_word) == expected


def test_search_suggestions_no_matches():
    products = ["havana"]
    search_word = "tatiana"
    assert search_suggestions(products, search_word) == [[] for _ in search_word]
