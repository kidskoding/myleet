from list_node import ListNode


def num_components(head: ListNode | None, nums: list[int]) -> int:
    # Problem 37: Linked List Components
    # Time: O(n)
    # Space: O(k) for the set of nums

    wanted = set(nums)
    count = 0
    in_component = False
    curr = head

    while curr is not None:
        if curr.val in wanted:
            if not in_component:
                count += 1
                in_component = True
        else:
            in_component = False
        curr = curr.next

    return count
