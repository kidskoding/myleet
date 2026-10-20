def filter_restaurants(restaurants: list[list[int]], vegan_friendly: int, max_price: int, max_distance: int) -> list[int]:
    kept = [
        (rating, rid)
        for rid, rating, vegan, price, distance in restaurants
        if vegan >= vegan_friendly and price <= max_price and distance <= max_distance
    ]
    return [rid for _, rid in sorted(kept, reverse=True)]
