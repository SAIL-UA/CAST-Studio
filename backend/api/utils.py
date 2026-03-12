# Import dependencies
import time
# TODO: Import tool and tool choice type from OpenAI library


def make_request_with_backoff(
    client,
    messages:str,
    temperature:float=0.3,
    delay:float=0.25,
    max_retries:int=5,
    backoff_factor:int=2,
    llm_model="gpt-4o",
    tools:list[dict[str, str]]=None,
    tool_choice=None
    ) -> dict:
        """
        TODO Documentation
        """
        try:
            # Initialize variables
            retries = 0

            # While still retries left
            while retries < max_retries:
                try:
                    response = client.chat.completions.create(
                        model=llm_model,
                        messages=messages,
                        temperature=temperature,
                        tools=tools,
                        tool_choice=tool_choice
                    )
                    return response
                except Exception as e:
                    print(f"Error: {e}")
                    retries += 1
                    delay *= backoff_factor
                    print(f"Retrying in {delay} seconds...\n")
                    time.sleep(delay)

            print(f"Max retries ({max_retries}) reached. Exiting...\n")
            return None
        
        except Exception as e:
            print(f"Error making request with backoff: {e}")
            return None
