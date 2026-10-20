from solution import find_itinerary


def test_find_itinerary_normal_case():
    tickets = [["MUC", "LHR"], ["JFK", "MUC"], ["SFO", "SJC"], ["LHR", "SFO"]]

    assert find_itinerary(tickets) == ["JFK", "MUC", "LHR", "SFO", "SJC"]


def test_find_itinerary_lexical_ordering():
    tickets = [
        ["JFK", "SFO"],
        ["JFK", "ATL"],
        ["SFO", "ATL"],
        ["ATL", "JFK"],
        ["ATL", "SFO"],
    ]

    assert find_itinerary(tickets) == ["JFK", "ATL", "JFK", "SFO", "ATL", "SFO"]
